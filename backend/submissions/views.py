import os
import zipfile
import io
import re
import boto3
from datetime import timedelta, date, time
from django.http import HttpResponse
from django.utils import timezone
from django.conf import settings
from rest_framework import status, generics, permissions, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import AccessToken
from submissions.models import Submission, SubmissionVersion
from submissions.serializers import SubmissionSerializer
from submissions.utils import (
    validate_file_metadata,
    generate_canonical_s3_key,
    generate_s3_presigned_upload_url
)
from tasks.models import TaskAssignment, Task
from logs.models import ActivityLog
from reminders_notifications.models import Notification
from accounts.models import User, UserProfile


class GenerateUploadURLView(APIView):
    def post(self, request):
        task_id = request.data.get('task_id')
        assignment_id = request.data.get('assignment_id')
        original_filename = request.data.get('filename') or request.data.get('original_filename')
        file_size = int(request.data.get('file_size') or 0)
        content_type = request.data.get('content_type') or 'application/octet-stream'

        if not original_filename or file_size <= 0:
            return Response({'detail': 'filename and valid file_size (>0) are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Server-side file validation
        is_valid, err_msg = validate_file_metadata(original_filename, file_size, content_type)
        if not is_valid:
            return Response({'detail': err_msg}, status=status.HTTP_400_BAD_REQUEST)

        # Lookup Task & Assignment safely for request.user
        task = None
        assignment = None

        if assignment_id:
            assignment_obj = TaskAssignment.objects.filter(id=assignment_id).first()
            if assignment_obj:
                task = assignment_obj.task
                if assignment_obj.user == request.user or request.user.is_admin_user:
                    assignment = assignment_obj

        if not task and task_id:
            task = Task.objects.filter(id=task_id).first()

        if not task:
            return Response({'detail': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Ensure assignment exists for request.user
        if not assignment:
            assignment, _ = TaskAssignment.objects.get_or_create(task=task, user=request.user)

        # Check allowed file format restriction on Task
        if task.allowed_format and task.allowed_format != 'ANY':
            ext = original_filename.rsplit('.', 1)[-1].lower() if '.' in original_filename else ''
            fmt = task.allowed_format
            format_map = {
                'PDF': ['pdf'],
                'PPT': ['ppt', 'pptx'],
                'DOC': ['doc', 'docx'],
                'IMAGE': ['png', 'jpg', 'jpeg'],
                'LINK': ['url', 'link', 'txt', 'pdf', 'png', 'jpg', 'doc', 'docx', 'html']
            }
            if fmt in format_map and ext not in format_map[fmt]:
                return Response({
                    'detail': f"This task strictly requires a '{fmt}' format file (e.g. .{', .'.join(format_map[fmt])})."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Generate canonical S3 key
        s3_key = generate_canonical_s3_key(request.user, task, original_filename)

        try:
            upload_data = generate_s3_presigned_upload_url(s3_key, content_type=content_type)
            upload_data['task_id'] = task.id
            upload_data['assignment_id'] = assignment.id
            upload_data['original_filename'] = original_filename
            return Response(upload_data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'detail': f"Failed to generate presigned upload URL: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ConfirmUploadView(APIView):
    def post(self, request):
        task_id = request.data.get('task_id')
        assignment_id = request.data.get('assignment_id')
        s3_key = request.data.get('s3_key')
        s3_bucket = request.data.get('s3_bucket') or getattr(settings, 'AWS_STORAGE_BUCKET_NAME', '')
        original_filename = request.data.get('file_name') or request.data.get('original_filename')
        file_type = request.data.get('file_type') or 'application/octet-stream'
        file_size = int(request.data.get('file_size') or 0)
        comments = request.data.get('comments', '')

        if not s3_key or not original_filename:
            return Response({'detail': 's3_key and original_filename are required.'}, status=status.HTTP_400_BAD_REQUEST)

        assignment = None
        task = None
        if assignment_id:
            assignment_obj = TaskAssignment.objects.filter(id=assignment_id).first()
            if assignment_obj:
                task = assignment_obj.task
                if assignment_obj.user == request.user or request.user.is_admin_user:
                    assignment = assignment_obj

        if not task and task_id:
            task = Task.objects.filter(id=task_id).first()

        if not task:
            return Response({'detail': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not assignment:
            assignment, _ = TaskAssignment.objects.get_or_create(task=task, user=request.user)

        task = assignment.task

        # Create new submission record for evidence file
        submission = Submission.objects.create(
            assignment=assignment,
            user=request.user,
            s3_key=s3_key,
            s3_bucket=s3_bucket,
            file_name=original_filename,
            file_type=file_type,
            file_size=file_size,
            comments=comments,
            status=Submission.StatusChoices.PENDING_APPROVAL if task.approval_required else Submission.StatusChoices.APPROVED
        )

        # Update assignment status
        if task.approval_required:
            assignment.status = TaskAssignment.StatusChoices.PENDING_APPROVAL
            admins = User.objects.filter(role__in=[User.RoleChoices.SUPER_ADMIN, User.RoleChoices.ADMIN])
            for admin_user in admins:
                Notification.objects.create(
                    user=admin_user,
                    title="Submission Pending Approval",
                    message=f"{request.user.get_full_name()} submitted evidence for '{task.title}'.",
                    type=Notification.TypeChoices.TASK_ASSIGNED
                )
        else:
            assignment.status = TaskAssignment.StatusChoices.COMPLETED
            assignment.completed_at = timezone.now()

        assignment.save()

        ActivityLog.objects.create(
            user=request.user,
            action='FILE_UPLOADED',
            details=f"Uploaded evidence '{original_filename}' for '{task.title}' to S3 ({s3_key})"
        )

        return Response(SubmissionSerializer(submission).data, status=status.HTTP_201_CREATED)


class DownloadURLView(APIView):
    def get(self, request, submission_id):
        submission = Submission.objects.filter(id=submission_id).first()
        if not submission:
            return Response({'detail': 'Evidence file not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not request.user.is_admin_user and submission.user != request.user:
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        download_url = submission.get_presigned_download_url()

        ActivityLog.objects.create(
            user=request.user,
            action='FILE_DOWNLOADED',
            details=f"Downloaded evidence '{submission.file_name}' for '{submission.assignment.task.title}'"
        )

        return Response({
            'submission_id': submission.id,
            'file_name': submission.file_name,
            'download_url': download_url
        })


class DeleteEvidenceView(APIView):
    def delete(self, request, submission_id):
        submission = Submission.objects.filter(id=submission_id).first()
        if not submission:
            return Response({'detail': 'Evidence file not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not request.user.is_admin_user and submission.user != request.user:
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        s3_key = submission.s3_key
        file_name = submission.file_name
        task_title = submission.assignment.task.title

        # Delete S3 object if present
        if s3_key:
            try:
                bucket = submission.s3_bucket or getattr(settings, 'AWS_STORAGE_BUCKET_NAME', '')
                region = getattr(settings, 'AWS_S3_REGION_NAME', 'eu-north-1')
                access_key = getattr(settings, 'AWS_ACCESS_KEY_ID', None)
                secret_key = getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)
                if bucket and access_key and secret_key:
                    s3_client = boto3.client('s3', aws_access_key_id=access_key, aws_secret_access_key=secret_key, region_name=region)
                    s3_client.delete_object(Bucket=bucket, Key=s3_key)
            except Exception as e:
                print(f"Error deleting S3 object {s3_key}: {e}")

        submission.delete()

        ActivityLog.objects.create(
            user=request.user,
            action='FILE_DELETED',
            details=f"Deleted evidence '{file_name}' for '{task_title}'"
        )

        return Response({'detail': 'Evidence file deleted successfully.'}, status=status.HTTP_200_OK)


class SubmitTaskView(APIView):
    """Legacy file upload fallback endpoint handling multipart direct form uploads."""
    def post(self, request):
        assignment_id = request.data.get('assignment_id')
        task_id = request.data.get('task_id')
        uploaded_file = request.FILES.get('file')
        comments = request.data.get('comments', '')

        if (not assignment_id and not task_id) or not uploaded_file:
            return Response({'detail': 'assignment_id (or task_id) and file are required.'}, status=status.HTTP_400_BAD_REQUEST)

        assignment = None
        task = None
        if assignment_id:
            assignment_obj = TaskAssignment.objects.filter(id=assignment_id).first()
            if assignment_obj:
                task = assignment_obj.task
                if assignment_obj.user == request.user or request.user.is_admin_user:
                    assignment = assignment_obj

        if not task and task_id:
            task = Task.objects.filter(id=task_id).first()

        if not task:
            return Response({'detail': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not assignment:
            assignment, _ = TaskAssignment.objects.get_or_create(task=task, user=request.user)

        file_name = uploaded_file.name
        file_type = uploaded_file.content_type or 'application/octet-stream'
        file_size = uploaded_file.size

        # Generate S3 key & upload to S3 if configured
        task = assignment.task
        s3_key = generate_canonical_s3_key(request.user, task, file_name)
        s3_bucket = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', '')

        if s3_bucket and getattr(settings, 'AWS_ACCESS_KEY_ID', None):
            try:
                if hasattr(uploaded_file, 'seek'):
                    uploaded_file.seek(0)
                s3_client = boto3.client(
                    's3',
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=settings.AWS_S3_REGION_NAME
                )
                s3_client.upload_fileobj(
                    uploaded_file,
                    s3_bucket,
                    s3_key,
                    ExtraArgs={'ContentType': file_type}
                )
            except Exception as e:
                print(f"Direct S3 upload fallback warning: {e}")

        submission = Submission.objects.create(
            assignment=assignment,
            user=request.user,
            s3_key=s3_key,
            s3_bucket=s3_bucket,
            file_name=file_name,
            file_type=file_type,
            file_size=file_size,
            comments=comments,
            status=Submission.StatusChoices.PENDING_APPROVAL if task.approval_required else Submission.StatusChoices.APPROVED
        )

        if task.approval_required:
            assignment.status = TaskAssignment.StatusChoices.PENDING_APPROVAL
            admins = User.objects.filter(role__in=[User.RoleChoices.SUPER_ADMIN, User.RoleChoices.ADMIN])
            for admin_user in admins:
                Notification.objects.create(
                    user=admin_user,
                    title="Submission Pending Approval",
                    message=f"{request.user.get_full_name()} submitted evidence for '{task.title}'.",
                    type=Notification.TypeChoices.TASK_ASSIGNED
                )
        else:
            assignment.status = TaskAssignment.StatusChoices.COMPLETED
            assignment.completed_at = timezone.now()

        assignment.save()

        ActivityLog.objects.create(
            user=request.user,
            action='FILE_UPLOADED',
            details=f"Uploaded '{file_name}' for '{task.title}'"
        )

        return Response(SubmissionSerializer(submission).data, status=status.HTTP_201_CREATED)


class SubmissionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SubmissionSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Submission.objects.all().order_by('-submitted_at')
        if not user.is_admin_user:
            qs = qs.filter(user=user)
        
        task_id = self.request.query_params.get('task_id')
        if task_id:
            qs = qs.filter(assignment__task_id=task_id)
        return qs


class BulkDownloadSubmissionsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        user = request.user
        token_str = request.query_params.get('token')

        if (not user or not user.is_authenticated) and token_str:
            try:
                validated_token = AccessToken(token_str)
                user_id = validated_token['user_id']
                user = User.objects.get(id=user_id)
            except Exception:
                return Response({'detail': 'Invalid or expired token credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user or not user.is_authenticated or not user.is_admin_user:
            return Response({'detail': 'Authentication & Admin permissions required.'}, status=status.HTTP_401_UNAUTHORIZED)

        task_id = request.query_params.get('task_id')
        batch_id = request.query_params.get('batch_id')

        submissions = Submission.objects.all().select_related('user', 'assignment__task')
        if task_id:
            submissions = submissions.filter(assignment__task_id=task_id)
        if batch_id:
            submissions = submissions.filter(user__batch_id=batch_id)

        buffer = io.BytesIO()
        used_filenames = set()

        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for sub in submissions:
                file_content = None
                # Try downloading from S3 first
                if sub.s3_key:
                    try:
                        bucket = sub.s3_bucket or getattr(settings, 'AWS_STORAGE_BUCKET_NAME', '')
                        s3_client = boto3.client('s3', aws_access_key_id=settings.AWS_ACCESS_KEY_ID, aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY, region_name=settings.AWS_S3_REGION_NAME)
                        obj = s3_client.get_object(Bucket=bucket, Key=sub.s3_key)
                        file_content = obj['Body'].read()
                    except Exception as e:
                        print(f"Error fetching S3 key {sub.s3_key}: {e}")

                if not file_content and sub.file:
                    try:
                        sub.file.open('rb')
                        file_content = sub.file.read()
                        sub.file.close()
                    except Exception as e:
                        print(f"Error reading local file for submission {sub.id}: {e}")

                if file_content:
                    user_first_name = (sub.user.first_name or sub.user.username).lower().replace(" ", "_")
                    task_title = sub.assignment.task.title if sub.assignment and sub.assignment.task else 'task'
                    task_slug = re.sub(r'[^a-zA-Z0-9_]', '_', task_title.lower())[:30]
                    clean_file_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', sub.file_name or 'file')
                    
                    formatted_name = f"Agilisium_All_Users_Proof/{user_first_name}_{task_slug}_{clean_file_name}"
                    
                    counter = 1
                    base_name, ext = os.path.splitext(formatted_name)
                    while formatted_name in used_filenames:
                        formatted_name = f"{base_name}_{counter}{ext}"
                        counter += 1
                    used_filenames.add(formatted_name)

                    zip_file.writestr(formatted_name, file_content)

        buffer.seek(0)
        response = HttpResponse(buffer.getvalue(), content_type='application/zip')
        response['Content-Disposition'] = 'attachment; filename="Agilisium_All_Users_Proof_SingleFolder.zip"'
        
        ActivityLog.objects.create(
            user=user,
            action='REPORT_EXPORTED',
            details="Exported All Users Proof ZIP Archive (Single Folder Mode)"
        )
        return response

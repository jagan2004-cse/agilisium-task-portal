import os
import zipfile
import io
import re
from datetime import timedelta, date, time
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, generics, permissions, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import AccessToken
from submissions.models import Submission, SubmissionVersion
from submissions.serializers import SubmissionSerializer
from tasks.models import TaskAssignment, Task
from logs.models import ActivityLog
from reminders_notifications.models import Notification
from accounts.models import User, UserProfile

class SubmitTaskView(APIView):
    def post(self, request):
        assignment_id = request.data.get('assignment_id')
        task_id = request.data.get('task_id')
        uploaded_file = request.FILES.get('file')
        comments = request.data.get('comments', '')

        if (not assignment_id and not task_id) or not uploaded_file:
            return Response({'detail': 'assignment_id (or task_id) and file are required.'}, status=status.HTTP_400_BAD_REQUEST)

        assignment = None

        # 1. Try lookup by assignment_id
        if assignment_id:
            assignment = TaskAssignment.objects.filter(id=assignment_id).first()

        # 2. If not found, try lookup by task_id & request.user
        if not assignment and (task_id or assignment_id):
            target_task_id = task_id or assignment_id
            assignment = TaskAssignment.objects.filter(task_id=target_task_id, user=request.user).first()
            
            # Auto-assign task to user if not already assigned
            if not assignment:
                try:
                    target_task = Task.objects.get(id=target_task_id)
                    assignment, _ = TaskAssignment.objects.get_or_create(task=target_task, user=request.user)
                except Task.DoesNotExist:
                    pass

        if not assignment:
            return Response({'detail': 'Task assignment not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not request.user.is_admin_user and assignment.user != request.user:
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        file_name = uploaded_file.name
        file_type = uploaded_file.content_type or 'application/octet-stream'
        file_size = uploaded_file.size

        existing_sub = Submission.objects.filter(assignment=assignment, user=request.user).first()
        if existing_sub:
            new_version = existing_sub.version + 1
            SubmissionVersion.objects.create(
                submission=existing_sub,
                file=existing_sub.file,
                version=existing_sub.version,
                comments=existing_sub.comments
            )
            existing_sub.file = uploaded_file
            existing_sub.file_name = file_name
            existing_sub.file_type = file_type
            existing_sub.file_size = file_size
            existing_sub.comments = comments
            existing_sub.version = new_version
            existing_sub.submitted_at = timezone.now()
            existing_sub.save()
            submission = existing_sub
        else:
            submission = Submission.objects.create(
                assignment=assignment,
                user=request.user,
                file=uploaded_file,
                file_name=file_name,
                file_type=file_type,
                file_size=file_size,
                comments=comments,
                version=1
            )

        task = assignment.task
        
        # Check if task is a Daily Recurring Task (12 AM to 12 AM completed 24h day cycle)
        if task.is_recurring or task.recurrence_type == Task.RecurrenceChoices.DAILY:
            # Record completion for today and reset assignment due date & time for tomorrow 12:00 AM
            tomorrow = date.today() + timedelta(days=1)
            task.due_date = tomorrow
            task.due_time = time(0, 0, 0) # Exact 12:00 AM Midnight deadline
            task.save()

            assignment.status = TaskAssignment.StatusChoices.PENDING
            assignment.completed_at = timezone.now()
            assignment.save()
        else:
            # One-Time Task
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
            action='SUBMISSION_UPLOADED',
            details=f"Uploaded '{file_name}' for '{task.title}'. Recurring Reset (12 AM Cycle): {task.is_recurring}"
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
                if sub.file:
                    try:
                        # Open and read file bytes directly (S3 & Local Storage Agnostic)
                        sub.file.open('rb')
                        file_content = sub.file.read()
                        sub.file.close()

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
                    except Exception as e:
                        print(f"Error reading file for submission {sub.id}: {e}")

        buffer.seek(0)
        response = HttpResponse(buffer.getvalue(), content_type='application/zip')
        response['Content-Disposition'] = 'attachment; filename="Agilisium_All_Users_Proof_SingleFolder.zip"'
        
        ActivityLog.objects.create(
            user=user,
            action='REPORT_EXPORTED',
            details="Exported All Users Proof ZIP Archive (Single Folder Mode)"
        )
        return response

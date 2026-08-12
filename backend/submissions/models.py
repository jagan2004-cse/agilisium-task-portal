import uuid
import boto3
from django.db import models
from django.conf import settings
from django.utils.text import slugify
from tasks.models import TaskAssignment

class Submission(models.Model):
    class StatusChoices(models.TextChoices):
        NOT_STARTED = 'NOT_STARTED', 'Not Started'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        SUBMITTED = 'SUBMITTED', 'Submitted'
        PENDING_APPROVAL = 'PENDING_APPROVAL', 'Pending Approval'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    assignment = models.ForeignKey(TaskAssignment, on_delete=models.CASCADE, related_name='submissions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='submissions')
    file = models.FileField(upload_to='media/uploads/', blank=True, null=True)
    s3_key = models.CharField(max_length=512, blank=True, default='')
    s3_bucket = models.CharField(max_length=255, blank=True, default='')
    etag = models.CharField(max_length=255, blank=True, default='')
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100, blank=True, default='')
    file_size = models.BigIntegerField(default=0) # in bytes
    comments = models.TextField(blank=True, default='')
    version = models.IntegerField(default=1)
    status = models.CharField(max_length=30, choices=StatusChoices.choices, default=StatusChoices.SUBMITTED)
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return f"Submission v{self.version} for {self.assignment.task.title} by {self.user.get_full_name()}"

    def generate_s3_key(self, original_filename):
        """
        Generate canonical S3 key structure:
        users/{userId}/{userName}/{taskSlug}/{uniqueId}-{originalFileName}
        """
        user_code = getattr(self.user, 'username', f"U{self.user.id:03d}")
        user_name_slug = slugify(f"{self.user.get_full_name()}-{user_code}") or user_code
        task_slug = slugify(self.assignment.task.title) or 'task'
        unique_file_id = uuid.uuid4().hex[:8]
        safe_filename = slugify(original_filename.rsplit('.', 1)[0])
        ext = original_filename.rsplit('.', 1)[-1].lower() if '.' in original_filename else ''
        filename_with_ext = f"{safe_filename}.{ext}" if ext else safe_filename

        return f"users/{user_code}/{user_name_slug}/{task_slug}/{unique_file_id}-{filename_with_ext}"

    def get_presigned_download_url(self, expires_in=3600):
        """Generate short-lived AWS S3 presigned GET URL for private file access."""
        if not self.s3_key:
            return self.file.url if self.file else ''

        bucket = self.s3_bucket or getattr(settings, 'AWS_STORAGE_BUCKET_NAME', '')
        region = getattr(settings, 'AWS_S3_REGION_NAME', 'eu-north-1')
        access_key = getattr(settings, 'AWS_ACCESS_KEY_ID', None)
        secret_key = getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)

        if not bucket or not access_key or not secret_key:
            return self.file.url if self.file else ''

        try:
            s3_client = boto3.client(
                's3',
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                region_name=region
            )
            url = s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': bucket,
                    'Key': self.s3_key,
                    'ResponseContentDisposition': f'inline; filename="{self.file_name}"'
                },
                ExpiresIn=expires_in
            )
            return url
        except Exception as e:
            print(f"Failed to generate presigned download URL for {self.s3_key}: {e}")
            return self.file.url if self.file else ''


class SubmissionVersion(models.Model):
    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name='history')
    file = models.FileField(upload_to='media/uploads/history/', blank=True, null=True)
    s3_key = models.CharField(max_length=512, blank=True, default='')
    version = models.IntegerField()
    comments = models.TextField(blank=True, default='')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.submission.assignment.task.title} v{self.version}"

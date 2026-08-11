from django.db import models
from django.conf import settings
from tasks.models import TaskAssignment

class Submission(models.Model):
    assignment = models.ForeignKey(TaskAssignment, on_delete=models.CASCADE, related_name='submissions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='submissions')
    file = models.FileField(upload_to='media/uploads/')
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50, blank=True)
    file_size = models.BigIntegerField(default=0) # in bytes
    comments = models.TextField(blank=True, default='')
    version = models.IntegerField(default=1)
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Submission v{self.version} for {self.assignment.task.title} by {self.user.get_full_name()}"


class SubmissionVersion(models.Model):
    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name='history')
    file = models.FileField(upload_to='media/uploads/history/')
    version = models.IntegerField()
    comments = models.TextField(blank=True, default='')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.submission.assignment.task.title} v{self.version}"

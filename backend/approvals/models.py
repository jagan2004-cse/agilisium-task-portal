from django.db import models
from django.conf import settings
from tasks.models import TaskAssignment
from submissions.models import Submission

class Approval(models.Model):
    class StatusChoices(models.TextChoices):
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        RESUBMISSION_REQUIRED = 'RESUBMISSION_REQUIRED', 'Resubmission Required'

    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name='approvals')
    assignment = models.ForeignKey(TaskAssignment, on_delete=models.CASCADE, related_name='approvals')
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='given_approvals')
    status = models.CharField(max_length=25, choices=StatusChoices.choices)
    comments = models.TextField(blank=True, default='')
    reviewed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Approval {self.status} for {self.assignment.task.title} by {self.reviewer.get_full_name()}"

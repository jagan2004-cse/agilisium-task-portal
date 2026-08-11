from django.db import models
from django.conf import settings

class Notification(models.Model):
    class TypeChoices(models.TextChoices):
        TASK_ASSIGNED = 'TASK_ASSIGNED', 'Task Assigned'
        REMINDER = 'REMINDER', 'Reminder'
        APPROVED = 'APPROVED', 'Submission Approved'
        REJECTED = 'REJECTED', 'Submission Rejected'
        PRESENTATION_UPCOMING = 'PRESENTATION_UPCOMING', 'Upcoming Presentation'
        SYSTEM = 'SYSTEM', 'System Alert'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    type = models.CharField(max_length=30, choices=TypeChoices.choices, default=TypeChoices.SYSTEM)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.user.get_full_name()}: {self.title}"

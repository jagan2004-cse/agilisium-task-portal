from django.db import models
from django.conf import settings

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name


class Task(models.Model):
    class PriorityChoices(models.TextChoices):
        LOW = 'LOW', 'Low'
        MEDIUM = 'MEDIUM', 'Medium'
        HIGH = 'HIGH', 'High'
        URGENT = 'URGENT', 'Urgent'

    class RecurrenceChoices(models.TextChoices):
        NONE = 'NONE', 'One Time'
        DAILY = 'DAILY', 'Daily'
        WEEKLY = 'WEEKLY', 'Weekly'
        MONTHLY = 'MONTHLY', 'Monthly'
        CUSTOM = 'CUSTOM', 'Custom'

    class AllowedFormatChoices(models.TextChoices):
        PPT = 'PPT', 'PPT Presentation (.ppt, .pptx)'
        DOC = 'DOC', 'Word Document (.doc, .docx)'
        IMAGE = 'IMAGE', 'Image Format (.png, .jpg, .jpeg)'
        PDF = 'PDF', 'PDF Document (.pdf)'
        LINK = 'LINK', 'Web Link / URL (http, https)'
        ANY = 'ANY', 'Any Format'

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    instructions = models.TextField(blank=True, default='')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    due_date = models.DateField()
    due_time = models.TimeField(default='18:00:00')
    priority = models.CharField(max_length=10, choices=PriorityChoices.choices, default=PriorityChoices.MEDIUM)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_tasks')
    reference_file = models.FileField(upload_to='media/reference_files/', blank=True, null=True)
    
    # Recurrence, Format Restriction & Approval Toggles
    is_recurring = models.BooleanField(default=False)
    recurrence_type = models.CharField(max_length=15, choices=RecurrenceChoices.choices, default=RecurrenceChoices.NONE)
    allowed_format = models.CharField(max_length=20, choices=AllowedFormatChoices.choices, default=AllowedFormatChoices.ANY)
    approval_required = models.BooleanField(default=True, help_text="If True, task requires Admin Approval. If False, auto-completes on submission.")
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.priority})"


class TaskAssignment(models.Model):
    class StatusChoices(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        SUBMITTED = 'SUBMITTED', 'Submitted'
        PENDING_APPROVAL = 'PENDING_APPROVAL', 'Pending Approval'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        COMPLETED = 'COMPLETED', 'Completed'
        LATE = 'LATE', 'Late'
        OVERDUE = 'OVERDUE', 'Overdue'

    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='assignments')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='task_assignments')
    status = models.CharField(max_length=20, choices=StatusChoices.choices, default=StatusChoices.PENDING)
    assigned_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    reminder_count = models.IntegerField(default=0)

    class Meta:
        unique_together = ('task', 'user')

    def __str__(self):
        return f"{self.user.get_full_name()} -> {self.task.title} [{self.status}]"

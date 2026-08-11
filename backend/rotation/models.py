from django.db import models
from django.conf import settings
from datetime import date

class ReviewCycle(models.Model):
    class StatusChoices(models.TextChoices):
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETED = 'COMPLETED', 'Completed'

    cycle_number = models.IntegerField(default=1)
    name = models.CharField(max_length=150, blank=True, default='')
    start_date = models.DateField(default=date.today)
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=StatusChoices.choices, default=StatusChoices.IN_PROGRESS)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-cycle_number']

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = f"Cycle {self.cycle_number}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Cycle #{self.cycle_number} ({self.status})"


class CodeExplanation(models.Model):
    cycle = models.ForeignKey(ReviewCycle, on_delete=models.CASCADE, related_name='explanations')
    member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='code_explanations')
    program_name = models.CharField(max_length=255, blank=True, default='')
    explanation_date = models.DateField(default=date.today)
    notes = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, default='COMPLETED')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('cycle', 'member')
        ordering = ['-explanation_date', '-created_at']

    def __str__(self):
        return f"{self.member.get_full_name()} - Cycle #{self.cycle.cycle_number} ({self.explanation_date})"


# Wheel Sessions & Results (Preserved for Lucky Spin Wheel)
class WheelSession(models.Model):
    activity_name = models.CharField(max_length=200, default="Today's Knowledge Activity")
    description = models.TextField(blank=True, default='')
    selection_mode = models.CharField(max_length=30, default='REMOVE_AFTER_SELECTION')
    selection_count = models.IntegerField(default=1)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Wheel Session: {self.activity_name} ({self.created_at.strftime('%Y-%m-%d %H:%M')})"


class WheelSpinResult(models.Model):
    class ConfirmationChoices(models.TextChoices):
        CONFIRMED = 'CONFIRMED', 'Confirmed'
        REJECTED = 'REJECTED', 'Rejected'
        CANCELLED = 'CANCELLED', 'Cancelled'

    session = models.ForeignKey(WheelSession, on_delete=models.CASCADE, related_name='results', null=True, blank=True)
    activity_name = models.CharField(max_length=200, default="Today's Knowledge Activity")
    selected_users = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='wheel_selections')
    selection_count = models.IntegerField(default=1)
    selection_mode = models.CharField(max_length=30, default='REMOVE_AFTER_SELECTION')
    confirmation_status = models.CharField(max_length=20, choices=ConfirmationChoices.choices, default=ConfirmationChoices.CONFIRMED)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Spin Result: {self.activity_name} at {self.timestamp.strftime('%H:%M:%S')}"

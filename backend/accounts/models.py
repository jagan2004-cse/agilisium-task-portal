from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

class Batch(models.Model):
    name = models.CharField(max_length=50, unique=True, help_text="e.g. Batch 12, Batch 13")
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Batches'

    def __str__(self):
        return self.name


class User(AbstractUser):
    class RoleChoices(models.TextChoices):
        SUPER_ADMIN = 'SUPER_ADMIN', 'Super Admin'
        ADMIN = 'ADMIN', 'Admin'
        TECHNICAL = 'TECHNICAL', 'Technical Support'
        USER = 'USER', 'User'

    email = models.EmailField(unique=True)
    middle_name = models.CharField(max_length=50, blank=True, null=True, default='')
    company = models.CharField(max_length=100, default='Agilisium')
    role = models.CharField(max_length=20, choices=RoleChoices.choices, default=RoleChoices.USER)
    batch = models.ForeignKey(Batch, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    department = models.CharField(max_length=100, default='Data Engineering & AI')
    employee_id = models.CharField(max_length=50, blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    is_email_verified = models.BooleanField(default=False)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    def get_full_name(self):
        parts = [self.first_name, self.middle_name, self.last_name]
        full_str = " ".join([p.strip() for p in parts if p and p.strip()])
        return full_str if full_str else self.username or self.email

    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"

    @property
    def is_admin_user(self):
        return self.role in [self.RoleChoices.SUPER_ADMIN, self.RoleChoices.ADMIN]

    @property
    def is_technical_user(self):
        return self.role == self.RoleChoices.TECHNICAL or self.is_admin_user


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    avatar = models.ImageField(upload_to='media/profiles/', blank=True, null=True)
    bio = models.TextField(blank=True, default='')
    streak_count = models.IntegerField(default=0)
    points = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile of {self.user.get_full_name()}"


class EmailOTP(models.Model):
    class PurposeChoices(models.TextChoices):
        VERIFY = 'VERIFY', 'Email Verification'
        RESET = 'RESET', 'Password Reset'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otps', null=True, blank=True)
    email = models.EmailField()
    otp_code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=20, choices=PurposeChoices.choices, default=PurposeChoices.VERIFY)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)

    class Meta:
        ordering = ['-created_at']

    def is_valid(self):
        return not self.is_used and self.attempts < 5 and timezone.now() <= self.expires_at

    def __str__(self):
        return f"OTP for {self.email} ({self.purpose}) - {self.otp_code}"

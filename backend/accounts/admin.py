from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from accounts.models import User, UserProfile, Batch, EmailOTP
from accounts.utils import create_and_send_otp

@admin.action(description="Send Password Reset OTP to Selected Users")
def send_password_reset_otp(modeladmin, request, queryset):
    count = 0
    for user in queryset:
        create_and_send_otp(user=user, email=user.email, purpose=EmailOTP.PurposeChoices.RESET)
        count += 1
    modeladmin.message_user(request, f"Successfully sent Password Reset OTP to {count} user(s).")

@admin.action(description="Mark Email as Verified")
def mark_email_verified(modeladmin, request, queryset):
    updated = queryset.update(is_email_verified=True)
    modeladmin.message_user(request, f"Successfully marked {updated} user(s) as email verified.")


class CustomUserAdmin(UserAdmin):
    model = User
    list_display = (
        'email', 'first_name', 'middle_name', 'last_name', 'company',
        'role', 'batch', 'is_email_verified', 'is_active', 'is_staff', 'date_joined'
    )
    list_filter = ('is_email_verified', 'is_active', 'is_staff', 'role', 'company', 'batch')
    search_fields = ('email', 'first_name', 'middle_name', 'last_name', 'username')
    ordering = ('-date_joined',)
    actions = [send_password_reset_otp, mark_email_verified]

    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'middle_name', 'last_name', 'email', 'company', 'department', 'employee_id', 'phone_number')}),
        ('Verification & Role', {'fields': ('is_email_verified', 'role', 'batch')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important Dates', {'fields': ('last_login', 'date_joined')}),
    )

admin.site.register(User, CustomUserAdmin)
admin.site.register(Batch)
admin.site.register(UserProfile)

@admin.register(EmailOTP)
class EmailOTPAdmin(admin.ModelAdmin):
    list_display = ('email', 'purpose', 'otp_code', 'is_used', 'attempts', 'created_at', 'expires_at')
    list_filter = ('purpose', 'is_used')
    search_fields = ('email', 'otp_code')
    readonly_fields = ('otp_code', 'created_at')

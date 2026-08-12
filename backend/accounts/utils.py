import secrets
import logging
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from accounts.models import EmailOTP

logger = logging.getLogger(__name__)

def generate_otp_code(length=6):
    """Generate a cryptographically secure numeric OTP string."""
    return ''.join([str(secrets.randbelow(10)) for _ in range(length)])

def create_and_send_otp(user, email, purpose=EmailOTP.PurposeChoices.VERIFY):
    """
    Generate a 6-digit OTP, store it in EmailOTP with 10-min expiration,
    and send it via Outlook/configured Django email SMTP.
    """
    # Invalidate previous unused OTPs for this email & purpose
    EmailOTP.objects.filter(email=email, purpose=purpose, is_used=False).update(is_used=True)

    otp_code = generate_otp_code(6)
    expires_at = timezone.now() + timedelta(minutes=10)

    otp_obj = EmailOTP.objects.create(
        user=user,
        email=email,
        otp_code=otp_code,
        purpose=purpose,
        expires_at=expires_at
    )

    action_title = "Email Verification Code" if purpose == EmailOTP.PurposeChoices.VERIFY else "Password Reset Verification Code"
    subject = f"Agilisium TRACKSPRINT — {action_title}"
    
    html_message = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #00a8b5; font-size: 24px; margin: 0;">AGILISIUM TRACKSPRINT</h2>
            <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Task & Evidence Automation Portal</p>
        </div>
        <div style="padding: 20px; background-color: #f8fafc; border-radius: 12px; margin-bottom: 20px;">
            <h3 style="color: #0f172a; margin-top: 0;">Your {action_title}</h3>
            <p style="color: #334155; font-size: 14px; line-height: 1.5;">
                Hello <strong>{user.get_full_name() if user else email}</strong>,<br/>
                Please use the following 6-digit verification code to complete your {action_title.lower()}:
            </p>
            <div style="text-align: center; margin: 24px 0;">
                <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #00a8b5; background-color: #e6fffa; padding: 12px 24px; border-radius: 12px; border: 1px border #99f6e4;">
                    {otp_code}
                </span>
            </div>
            <p style="color: #64748b; font-size: 12px; text-align: center; margin-bottom: 0;">
                This code is valid for <strong>10 minutes</strong> and can only be used once.
            </p>
        </div>
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 24px;">
            If you did not request this verification code, please ignore this email or contact your administrator.
        </p>
    </div>
    """

    plain_message = f"Your Agilisium TRACKSPRINT {action_title} is: {otp_code}. Valid for 10 minutes."

    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@agilisium.com'),
            recipient_list=[email],
            html_message=html_message,
            fail_silently=False
        )
        logger.info(f"OTP Email sent successfully to {email} ({purpose})")
    except Exception as e:
        logger.warning(f"Failed to send email to {email}: {e}. OTP Code for testing: {otp_code}")
        # Printed for local development fallback log inspection
        print(f"\n==========================================")
        print(f"[DEVELOPMENT FALLBACK] OTP CODE FOR {email}: {otp_code} (Purpose: {purpose})")
        print(f"==========================================\n")

    return otp_obj

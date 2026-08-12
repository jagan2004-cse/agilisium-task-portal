from rest_framework import viewsets, permissions, status, serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from accounts.models import User, UserProfile, Batch, EmailOTP
from accounts.utils import create_and_send_otp
from accounts.serializers import (
    UserSerializer, UserProfileSerializer, BatchSerializer,
    ChangePasswordSerializer, AdminCreateUserSerializer,
    SignupSerializer, OTPVerifySerializer, ResendOTPSerializer,
    ForgotPasswordRequestSerializer, ForgotPasswordResetSerializer
)
from logs.models import ActivityLog

from django.db.models import Q

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        login_input = attrs.get(self.username_field) or self.initial_data.get('email') or self.initial_data.get('username')
        password = attrs.get('password')

        if login_input and password:
            user_obj = User.objects.filter(Q(email__iexact=login_input) | Q(username__iexact=login_input)).first()
            if user_obj and user_obj.check_password(password):
                attrs[self.username_field] = getattr(user_obj, self.username_field, user_obj.username)

        data = super().validate(attrs)
        
        # Check email verification status for standard users
        if not self.user.is_email_verified and not self.user.is_admin_user:
            raise serializers.ValidationError({
                'detail': 'Your email address is not verified. Please verify your email using the OTP sent to your Outlook account.',
                'email_unverified': True,
                'email': self.user.email
            })

        user_serializer = UserSerializer(self.user)
        data['user'] = user_serializer.data
        return data

class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class SignupView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Send Email Verification OTP to user's company Outlook email
            create_and_send_otp(user=user, email=user.email, purpose=EmailOTP.PurposeChoices.VERIFY)
            
            ActivityLog.objects.create(
                user=user,
                action='USER_REGISTERED',
                details=f"User '{user.email}' registered. Verification OTP sent."
            )

            return Response({
                'message': f"Account registered successfully! A 6-digit verification code has been sent to {user.email}.",
                'email': user.email,
                'requires_verification': True
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyEmailOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email'].strip().lower()
        otp_code = serializer.validated_data['otp_code'].strip()
        purpose = serializer.validated_data.get('purpose', EmailOTP.PurposeChoices.VERIFY)

        otp_record = EmailOTP.objects.filter(email=email, purpose=purpose, is_used=False).first()
        if not otp_record:
            return Response({'detail': 'No active verification code found for this email address.'}, status=status.HTTP_400_BAD_REQUEST)

        if not otp_record.is_valid():
            return Response({'detail': 'Verification code has expired or maximum attempts reached. Please request a new code.'}, status=status.HTTP_400_BAD_REQUEST)

        if otp_record.otp_code != otp_code:
            otp_record.attempts += 1
            otp_record.save()
            attempts_remaining = 5 - otp_record.attempts
            return Response({'detail': f'Invalid verification code. {attempts_remaining} attempts remaining.'}, status=status.HTTP_400_BAD_REQUEST)

        # Mark OTP used
        otp_record.is_used = True
        otp_record.save()

        # Mark user verified
        user = User.objects.filter(email=email).first()
        if user:
            user.is_email_verified = True
            user.save()

            ActivityLog.objects.create(
                user=user,
                action='EMAIL_VERIFIED',
                details=f"Email '{email}' verified successfully via OTP."
            )

        return Response({
            'message': 'Email address verified successfully! You can now sign in.',
            'verified': True
        }, status=status.HTTP_200_OK)


class ResendOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResendOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email'].strip().lower()
        purpose = serializer.validated_data.get('purpose', EmailOTP.PurposeChoices.VERIFY)

        user = User.objects.filter(email=email).first()
        if not user and purpose == EmailOTP.PurposeChoices.VERIFY:
            return Response({'detail': 'No registered account found with this email address.'}, status=status.HTTP_404_NOT_FOUND)

        create_and_send_otp(user=user, email=email, purpose=purpose)
        return Response({'message': f'A new verification code has been sent to {email}.'})


class ForgotPasswordRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email'].strip().lower()
        user = User.objects.get(email=email)

        create_and_send_otp(user=user, email=email, purpose=EmailOTP.PurposeChoices.RESET)

        return Response({
            'message': f'A 6-digit password reset code has been sent to {email}.',
            'email': email
        }, status=status.HTTP_200_OK)


class ForgotPasswordVerifyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email'].strip().lower()
        otp_code = serializer.validated_data['otp_code'].strip()

        otp_record = EmailOTP.objects.filter(email=email, purpose=EmailOTP.PurposeChoices.RESET, is_used=False).first()
        if not otp_record or not otp_record.is_valid():
            return Response({'detail': 'Invalid or expired password reset code.'}, status=status.HTTP_400_BAD_REQUEST)

        if otp_record.otp_code != otp_code:
            otp_record.attempts += 1
            otp_record.save()
            return Response({'detail': 'Invalid verification code.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'message': 'OTP code verified. Proceed to set new password.'}, status=status.HTTP_200_OK)


class ForgotPasswordResetView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordResetSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email'].strip().lower()
        otp_code = serializer.validated_data['otp_code'].strip()
        new_password = serializer.validated_data['new_password']

        otp_record = EmailOTP.objects.filter(email=email, purpose=EmailOTP.PurposeChoices.RESET, is_used=False).first()
        if not otp_record or not otp_record.is_valid() or otp_record.otp_code != otp_code:
            return Response({'detail': 'Invalid or expired password reset code.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email=email).first()
        if not user:
            return Response({'detail': 'User account not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Secure password hashing with Django set_password()
        user.set_password(new_password)
        user.is_email_verified = True # Auto-verify upon successful password reset
        user.save()

        # Mark OTP used
        otp_record.is_used = True
        otp_record.save()

        ActivityLog.objects.create(
            user=user,
            action='PASSWORD_RESET',
            details=f"User '{email}' reset password via Outlook OTP."
        )

        return Response({'message': 'Password changed successfully! You can now sign in with your new password.'}, status=status.HTTP_200_OK)


class CurrentUserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.validated_data['old_password']):
                return Response({'detail': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({'detail': 'Password updated successfully.'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = request.query_params.get('role')
        batch_id = request.query_params.get('batch_id')
        search = request.query_params.get('search')
        
        users = User.objects.all().order_by('first_name')
        if role:
            users = users.filter(role=role)
        if batch_id:
            users = users.filter(batch_id=batch_id)
        if search:
            users = users.filter(first_name__icontains=search) | users.filter(middle_name__icontains=search) | users.filter(last_name__icontains=search) | users.filter(email__icontains=search)
            
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    def post(self, request):
        if request.user.role not in [User.RoleChoices.ADMIN, User.RoleChoices.SUPER_ADMIN]:
            return Response({'detail': 'Only Admins can create new users.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = AdminCreateUserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BatchViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = Batch.objects.all().order_by('id')
    serializer_class = BatchSerializer

    def perform_create(self, serializer):
        serializer.save()

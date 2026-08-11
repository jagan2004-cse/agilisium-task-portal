from rest_framework import serializers
from accounts.models import User, UserProfile, Batch, EmailOTP

class BatchSerializer(serializers.ModelSerializer):
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Batch
        fields = ['id', 'name', 'description', 'user_count', 'created_at']

    def get_user_count(self, obj):
        return obj.users.count()


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['avatar', 'bio', 'streak_count', 'points', 'created_at']


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    batch_name = serializers.CharField(source='batch.name', read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'middle_name', 'last_name', 'full_name',
            'company', 'role', 'batch', 'batch_name', 'department', 'employee_id', 'phone_number',
            'is_email_verified', 'profile'
        ]

    def get_full_name(self, obj):
        return obj.get_full_name()


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True)
    middle_name = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = User
        fields = ['first_name', 'middle_name', 'last_name', 'email', 'password', 'confirm_password', 'batch']

    def validate_email(self, value):
        email = value.strip().lower()
        if not email.endswith('@agilisium.com'):
            raise serializers.ValidationError("Only company emails (@agilisium.com) are allowed to register.")
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("An account with this company email already exists.")
        return email

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        email = validated_data['email']
        username = email.split('@')[0]

        # Ensure batch defaults to Batch 12 if not specified
        batch = validated_data.get('batch')
        if not batch:
            batch = Batch.objects.filter(name__icontains='12').first() or Batch.objects.first()

        user = User.objects.create(
            username=username,
            email=email,
            first_name=validated_data.get('first_name', ''),
            middle_name=validated_data.get('middle_name', ''),
            last_name=validated_data.get('last_name', ''),
            company='Agilisium',
            batch=batch,
            role=User.RoleChoices.USER,
            is_email_verified=False
        )
        user.set_password(password)
        user.save()
        UserProfile.objects.create(user=user)
        return user


class OTPVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6)
    purpose = serializers.ChoiceField(choices=EmailOTP.PurposeChoices.choices, default=EmailOTP.PurposeChoices.VERIFY)


class ResendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    purpose = serializers.ChoiceField(choices=EmailOTP.PurposeChoices.choices, default=EmailOTP.PurposeChoices.VERIFY)


class ForgotPasswordRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        email = value.strip().lower()
        if not User.objects.filter(email=email).exists():
            raise serializers.ValidationError("No account found with this email address.")
        return email


class ForgotPasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(min_length=6, write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "New passwords do not match."})
        return data


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)


class AdminCreateUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    middle_name = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'middle_name', 'last_name', 'role', 'batch', 'department', 'employee_id', 'password']

    def create(self, validated_data):
        password = validated_data.pop('password')
        username = validated_data['email'].split('@')[0]
        user = User.objects.create(username=username, company='Agilisium', is_email_verified=True, **validated_data)
        user.set_password(password)
        user.save()
        UserProfile.objects.create(user=user)
        return user

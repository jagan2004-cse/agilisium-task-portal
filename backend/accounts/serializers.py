from rest_framework import serializers
from accounts.models import User, UserProfile, Batch

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
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'batch', 'batch_name', 'department', 'employee_id', 'phone_number', 'profile'
        ]

    def get_full_name(self, obj):
        return obj.get_full_name()


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)


class AdminCreateUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role', 'batch', 'department', 'employee_id', 'password']

    def create(self, validated_data):
        password = validated_data.pop('password')
        username = validated_data['email'].split('@')[0]
        user = User.objects.create(username=username, **validated_data)
        user.set_password(password)
        user.save()
        UserProfile.objects.create(user=user)
        return user

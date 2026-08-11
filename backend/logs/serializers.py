from rest_framework import serializers
from logs.models import ActivityLog
from accounts.serializers import UserSerializer

class ActivityLogSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)

    class Meta:
        model = ActivityLog
        fields = ['id', 'user', 'user_details', 'action', 'details', 'ip_address', 'timestamp']

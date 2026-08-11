from rest_framework import serializers
from rotation.models import (
    ReviewCycle, CodeExplanation, WheelSession, WheelSpinResult
)
from accounts.serializers import UserSerializer

class ReviewCycleSerializer(serializers.ModelSerializer):
    completed_count = serializers.SerializerMethodField()
    total_members = serializers.SerializerMethodField()

    class Meta:
        model = ReviewCycle
        fields = ['id', 'cycle_number', 'name', 'start_date', 'end_date', 'status', 'created_by', 'created_at', 'completed_count', 'total_members']

    def get_completed_count(self, obj):
        return obj.explanations.count()

    def get_total_members(self, obj):
        from accounts.models import User
        count = User.objects.filter(role=User.RoleChoices.USER).count()
        return count if count > 0 else 27


class CodeExplanationSerializer(serializers.ModelSerializer):
    member_details = UserSerializer(source='member', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = CodeExplanation
        fields = ['id', 'cycle', 'member', 'member_details', 'program_name', 'explanation_date', 'notes', 'status', 'created_by', 'created_by_name', 'created_at']


class WheelSpinResultSerializer(serializers.ModelSerializer):
    selected_users_details = UserSerializer(source='selected_users', many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = WheelSpinResult
        fields = ['id', 'session', 'activity_name', 'selected_users', 'selected_users_details', 'selection_count', 'selection_mode', 'confirmation_status', 'created_by', 'created_by_name', 'timestamp']

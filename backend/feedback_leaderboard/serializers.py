from rest_framework import serializers
from feedback_leaderboard.models import PresentationFeedback, Announcement
from accounts.serializers import UserSerializer

class PresentationFeedbackSerializer(serializers.ModelSerializer):
    reviewer_details = UserSerializer(source='reviewer', read_only=True)

    class Meta:
        model = PresentationFeedback
        fields = ['id', 'explanation', 'reviewer', 'reviewer_details', 'rating', 'comments', 'created_at']


class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = Announcement
        fields = ['id', 'title', 'content', 'created_by', 'created_by_name', 'is_pinned', 'created_at']

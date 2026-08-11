from rest_framework import serializers
from submissions.models import Submission, SubmissionVersion
from accounts.serializers import UserSerializer
from tasks.serializers import TaskAssignmentSerializer

class SubmissionVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubmissionVersion
        fields = ['id', 'version', 'file', 'comments', 'uploaded_at']


class SubmissionSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    assignment_details = TaskAssignmentSerializer(source='assignment', read_only=True)
    history = SubmissionVersionSerializer(many=True, read_only=True)

    class Meta:
        model = Submission
        fields = ['id', 'assignment', 'assignment_details', 'user', 'user_details', 'file', 'file_name', 'file_type', 'file_size', 'comments', 'version', 'submitted_at', 'history']

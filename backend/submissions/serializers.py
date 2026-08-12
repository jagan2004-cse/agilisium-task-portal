from rest_framework import serializers
from submissions.models import Submission, SubmissionVersion
from accounts.serializers import UserSerializer
from tasks.serializers import TaskAssignmentSerializer

class SubmissionVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubmissionVersion
        fields = ['id', 'version', 'file', 's3_key', 'comments', 'uploaded_at']


class SubmissionSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    assignment_details = TaskAssignmentSerializer(source='assignment', read_only=True)
    history = SubmissionVersionSerializer(many=True, read_only=True)
    presigned_download_url = serializers.SerializerMethodField()
    task_title = serializers.CharField(source='assignment.task.title', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = Submission
        fields = [
            'id', 'assignment', 'assignment_details', 'user', 'user_details',
            'user_name', 'user_email', 'task_title',
            'file', 's3_key', 's3_bucket', 'etag', 'file_name', 'file_type',
            'file_size', 'comments', 'version', 'status', 'submitted_at',
            'updated_at', 'presigned_download_url', 'history'
        ]

    def get_presigned_download_url(self, obj):
        return obj.get_presigned_download_url()

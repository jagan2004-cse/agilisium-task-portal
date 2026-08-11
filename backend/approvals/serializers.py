from rest_framework import serializers
from approvals.models import Approval
from submissions.serializers import SubmissionSerializer
from accounts.serializers import UserSerializer

class ApprovalSerializer(serializers.ModelSerializer):
    submission_details = SubmissionSerializer(source='submission', read_only=True)
    reviewer_details = UserSerializer(source='reviewer', read_only=True)

    class Meta:
        model = Approval
        fields = ['id', 'submission', 'submission_details', 'assignment', 'reviewer', 'reviewer_details', 'status', 'comments', 'reviewed_at']

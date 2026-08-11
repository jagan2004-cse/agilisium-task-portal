from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from approvals.models import Approval
from approvals.serializers import ApprovalSerializer
from submissions.models import Submission
from tasks.models import TaskAssignment
from reminders_notifications.models import Notification
from accounts.models import UserProfile
from logs.models import ActivityLog

class ReviewSubmissionView(APIView):
    def post(self, request):
        if not request.user.is_admin_user:
            return Response({'detail': 'Admin permission required.'}, status=status.HTTP_403_FORBIDDEN)

        submission_id = request.data.get('submission_id')
        review_status = request.data.get('status') # APPROVED, REJECTED, RESUBMISSION_REQUIRED
        comments = request.data.get('comments', '')

        if not submission_id or not review_status:
            return Response({'detail': 'submission_id and status are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            submission = Submission.objects.get(id=submission_id)
        except Submission.DoesNotExist:
            return Response({'detail': 'Submission not found.'}, status=status.HTTP_404_NOT_FOUND)

        assignment = submission.assignment

        approval = Approval.objects.create(
            submission=submission,
            assignment=assignment,
            reviewer=request.user,
            status=review_status,
            comments=comments
        )

        # Update assignment status
        if review_status == Approval.StatusChoices.APPROVED:
            assignment.status = TaskAssignment.StatusChoices.APPROVED
            assignment.completed_at = timezone.now()
            # Award points and streak
            profile, _ = UserProfile.objects.get_or_create(user=submission.user)
            profile.points += 50
            profile.streak_count += 1
            profile.save()
            notif_type = Notification.TypeChoices.APPROVED
            notif_msg = f"Your submission for '{assignment.task.title}' was APPROVED by {request.user.get_full_name()}!"
        else:
            assignment.status = TaskAssignment.StatusChoices.REJECTED
            notif_type = Notification.TypeChoices.REJECTED
            notif_msg = f"Your submission for '{assignment.task.title}' requires revision: {comments}"

        assignment.save()

        # Send in-app notification
        Notification.objects.create(
            user=submission.user,
            title=f"Submission Review: {review_status}",
            message=notif_msg,
            type=notif_type
        )

        ActivityLog.objects.create(
            user=request.user,
            action='APPROVAL_GIVEN',
            details=f"Reviewed submission for {submission.user.get_full_name()} -> {review_status}"
        )

        return Response(ApprovalSerializer(approval).data, status=status.HTTP_200_OK)

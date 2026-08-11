from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from feedback_leaderboard.models import PresentationFeedback, Announcement
from feedback_leaderboard.serializers import PresentationFeedbackSerializer, AnnouncementSerializer
from accounts.models import UserProfile
from accounts.serializers import UserProfileSerializer

class PresentationFeedbackViewSet(viewsets.ModelViewSet):
    queryset = PresentationFeedback.objects.all().order_by('-created_at')
    serializer_class = PresentationFeedbackSerializer


class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.all().order_by('-is_pinned', '-created_at')
    serializer_class = AnnouncementSerializer


class LeaderboardView(APIView):
    def get(self, request):
        profiles = UserProfile.objects.filter(user__role='USER').select_related('user').order_by('-points', '-streak_count')[:25]
        data = []
        for rank, p in enumerate(profiles, 1):
            data.append({
                'rank': rank,
                'user_id': p.user.id,
                'name': p.user.get_full_name(),
                'email': p.user.email,
                'points': p.points,
                'streak_count': p.streak_count,
                'badge': 'Knowledge Champion' if rank == 1 else 'Consistent Learner'
            })
        return Response(data)

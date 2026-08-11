from rest_framework import generics
from logs.models import ActivityLog
from logs.serializers import ActivityLogSerializer

class ActivityLogListView(generics.ListAPIView):
    serializer_class = ActivityLogSerializer

    def get_queryset(self):
        user = self.request.user
        qs = ActivityLog.objects.all().order_by('-timestamp')
        if not user.is_admin_user:
            qs = qs.filter(user=user)
        return qs[:100]

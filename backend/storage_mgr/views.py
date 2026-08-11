from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, Count
from submissions.models import Submission

class StorageAnalyticsView(APIView):
    def get(self, request):
        total_size_bytes = Submission.objects.aggregate(total=Sum('file_size'))['total'] or 0
        total_files = Submission.objects.count()

        # Convert to MB/GB
        total_size_mb = round(total_size_bytes / (1024 * 1024), 2)
        total_size_gb = round(total_size_bytes / (1024 * 1024 * 1024), 3)

        # Storage quota limit (e.g. 50 GB)
        quota_gb = 50.0
        used_pct = round((total_size_gb / quota_gb) * 100, 2)

        # Largest files
        largest_files = Submission.objects.order_by('-file_size')[:5]
        largest_data = [
            {
                'id': f.id,
                'file_name': f.file_name,
                'user_name': f.user.get_full_name(),
                'size_mb': round(f.file_size / (1024 * 1024), 2),
                'submitted_at': f.submitted_at
            }
            for f in largest_files
        ]

        return Response({
            'total_files': total_files,
            'total_size_mb': total_size_mb,
            'total_size_gb': total_size_gb,
            'quota_gb': quota_gb,
            'remaining_gb': round(quota_gb - total_size_gb, 2),
            'used_percentage': used_pct,
            'largest_files': largest_data
        })

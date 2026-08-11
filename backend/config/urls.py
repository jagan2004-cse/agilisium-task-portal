from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter

from accounts.views import LoginView, CurrentUserProfileView, UserListView, ChangePasswordView, BatchViewSet
from tasks.views import CategoryViewSet, TaskViewSet, TaskAssignmentViewSet
from submissions.views import SubmitTaskView, SubmissionViewSet, BulkDownloadSubmissionsView
from approvals.views import ReviewSubmissionView
from rotation.views import (
    CodeReviewDashboardView, CodeExplanationView, BulkSeedExplanationsView, MembersStatusListView,
    CycleHistoryView, MemberHistoryView, WheelSpinView, WheelHistoryView
)
from reminders_notifications.views import NotificationListView, MarkNotificationsReadView
from defaulters_reports.views import DefaultersListView, ExportExcelReportView
from storage_mgr.views import StorageAnalyticsView
from logs.views import ActivityLogListView
from feedback_leaderboard.views import LeaderboardView, AnnouncementViewSet, PresentationFeedbackViewSet

router = DefaultRouter()
router.register(r'batches', BatchViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'tasks', TaskViewSet)
router.register(r'assignments', TaskAssignmentViewSet, basename='assignment')
router.register(r'submissions', SubmissionViewSet, basename='submission')
router.register(r'announcements', AnnouncementViewSet)
router.register(r'feedback', PresentationFeedbackViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Auth & Users
    path('api/auth/login/', LoginView.as_view(), name='login'),
    path('api/auth/profile/', CurrentUserProfileView.as_view(), name='profile'),
    path('api/auth/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('api/users/', UserListView.as_view(), name='user-list'),

    # Submissions & Approvals
    path('api/submissions/submit/', SubmitTaskView.as_view(), name='submit-task'),
    path('api/submissions/bulk-download/', BulkDownloadSubmissionsView.as_view(), name='bulk-download'),
    path('api/approvals/review/', ReviewSubmissionView.as_view(), name='review-submission'),

    # General Lucky Wheel
    path('api/wheel/spin/', WheelSpinView.as_view(), name='wheel-spin'),
    path('api/wheel/history/', WheelHistoryView.as_view(), name='wheel-history'),

    # Flexible Code Review / Code Explanation Cycle Tracker & Bulk Seeding
    path('api/rotation/dashboard/', CodeReviewDashboardView.as_view(), name='rotation-dashboard'),
    path('api/rotation/explanations/', CodeExplanationView.as_view(), name='code-explanations'),
    path('api/rotation/explanations/<int:pk>/', CodeExplanationView.as_view(), name='code-explanation-detail'),
    path('api/rotation/bulk-seed/', BulkSeedExplanationsView.as_view(), name='code-explanation-bulk-seed'),
    path('api/rotation/members/', MembersStatusListView.as_view(), name='code-review-members'),
    path('api/rotation/cycles/', CycleHistoryView.as_view(), name='cycle-history-list'),
    path('api/rotation/cycles/<int:pk>/', CycleHistoryView.as_view(), name='cycle-history-detail'),
    path('api/rotation/member-history/<int:member_id>/', MemberHistoryView.as_view(), name='member-history'),

    # Notifications & Reminders
    path('api/notifications/', NotificationListView.as_view(), name='notifications'),
    path('api/notifications/mark-read/', MarkNotificationsReadView.as_view(), name='notifications-mark-read'),

    # Reports & Storage
    path('api/defaulters/', DefaultersListView.as_view(), name='defaulters'),
    path('api/reports/export-excel/', ExportExcelReportView.as_view(), name='export-excel'),
    path('api/storage/analytics/', StorageAnalyticsView.as_view(), name='storage-analytics'),

    # Logs & Leaderboard
    path('api/logs/', ActivityLogListView.as_view(), name='logs'),
    path('api/leaderboard/', LeaderboardView.as_view(), name='leaderboard'),

    path('api/', include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

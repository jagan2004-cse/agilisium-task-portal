from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from tasks.models import Category, Task, TaskAssignment
from tasks.serializers import CategorySerializer, TaskSerializer, TaskAssignmentSerializer
from accounts.models import User
from logs.models import ActivityLog
from reminders_notifications.models import Notification

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all().order_by('-created_at')
    serializer_class = TaskSerializer

    def perform_create(self, serializer):
        task = serializer.save(created_by=self.request.user)
        
        # Automatically assign to all batch users if assign_all param is passed
        assign_all = self.request.data.get('assign_all', True)
        if assign_all:
            batch_users = User.objects.filter(role=User.RoleChoices.USER)
            for u in batch_users:
                TaskAssignment.objects.get_or_create(task=task, user=u)
                Notification.objects.create(
                    user=u,
                    title="New Task Assigned",
                    message=f"You have been assigned: {task.title}",
                    type=Notification.TypeChoices.TASK_ASSIGNED
                )
        
        ActivityLog.objects.create(
            user=self.request.user,
            action='TASK_CREATED',
            details=f"Created task '{task.title}' (Approval Required: {task.approval_required})"
        )

    @action(detail=True, methods=['post'])
    def assign_users(self, request, pk=None):
        task = self.get_object()
        user_ids = request.data.get('user_ids', [])
        for uid in user_ids:
            try:
                u = User.objects.get(id=uid)
                TaskAssignment.objects.get_or_create(task=task, user=u)
                Notification.objects.create(
                    user=u,
                    title="New Task Assigned",
                    message=f"You have been assigned task: {task.title}",
                    type=Notification.TypeChoices.TASK_ASSIGNED
                )
            except User.DoesNotExist:
                pass
        return Response({'status': 'Users assigned successfully'})


class TaskAssignmentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TaskAssignmentSerializer

    def get_queryset(self):
        user = self.request.user
        qs = TaskAssignment.objects.all().order_by('-assigned_at')
        if not user.is_admin_user:
            qs = qs.filter(user=user)
        
        # Filters
        status_param = self.request.query_params.get('status')
        task_id = self.request.query_params.get('task_id')
        if status_param:
            qs = qs.filter(status=status_param)
        if task_id:
            qs = qs.filter(task_id=task_id)
        return qs

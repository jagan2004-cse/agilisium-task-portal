import openpyxl
from datetime import datetime, date, time
from django.utils import timezone
from django.http import HttpResponse
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import AccessToken
from tasks.models import TaskAssignment, Task
from accounts.models import User
from logs.models import ActivityLog

class DefaultersListView(APIView):
    def get(self, request):
        now = timezone.now()
        current_date = now.date()
        current_time = now.time()

        # Query all pending/rejected task assignments for non-archived tasks
        pending_assignments = TaskAssignment.objects.filter(
            status__in=[TaskAssignment.StatusChoices.PENDING, TaskAssignment.StatusChoices.REJECTED],
            task__is_archived=False
        ).select_related('task', 'user')

        results = []
        for assign in pending_assignments:
            task = assign.task
            due_date = task.due_date
            due_time = task.due_time or time(18, 0, 0)
            
            # Combine due_date and due_time for precise deadline check
            task_deadline = datetime.combine(due_date, due_time)
            now_naive = datetime.now()

            # Check if current time has passed deadline
            if task_deadline < now_naive:
                time_diff = now_naive - task_deadline
                days_late = time_diff.days
                hours_late = int(time_diff.seconds // 3600)
                minutes_late = int((time_diff.seconds % 3600) // 60)

                if days_late > 0:
                    overdue_str = f"{days_late} day(s) overdue"
                elif hours_late > 0:
                    overdue_str = f"{hours_late} hr(s) {minutes_late} min(s) overdue"
                else:
                    overdue_str = f"{minutes_late} min(s) overdue"

                results.append({
                    'assignment_id': assign.id,
                    'user_name': assign.user.get_full_name(),
                    'user_email': assign.user.email,
                    'task_title': task.title,
                    'due_date': str(due_date),
                    'due_time': due_time.strftime('%I:%M %p') if hasattr(due_time, 'strftime') else str(due_time),
                    'days_late': overdue_str,
                    'status': assign.status,
                    'reminder_count': assign.reminder_count
                })

        return Response({
            'total_defaulters': len(results),
            'defaulters': results
        })


class ExportExcelReportView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        user = request.user
        token_str = request.query_params.get('token')

        if (not user or not user.is_authenticated) and token_str:
            try:
                validated_token = AccessToken(token_str)
                user_id = validated_token['user_id']
                user = User.objects.get(id=user_id)
            except Exception:
                return Response({'detail': 'Invalid or expired token credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user or not user.is_authenticated or not user.is_admin_user:
            return Response({'detail': 'Authentication & Admin permissions required.'}, status=status.HTTP_401_UNAUTHORIZED)

        report_type = request.query_params.get('type', 'completed')

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = f"Agilisium_{report_type.capitalize()}_Report"

        now_naive = datetime.now()

        if report_type == 'defaulters':
            ws.append(['User Name', 'Email', 'Task Title', 'Due Date', 'Due Time', 'Overdue Status', 'Status'])
            pending_assignments = TaskAssignment.objects.filter(
                status__in=[TaskAssignment.StatusChoices.PENDING, TaskAssignment.StatusChoices.REJECTED]
            ).select_related('task', 'user')

            for d in pending_assignments:
                task = d.task
                due_time = task.due_time or time(18, 0, 0)
                task_deadline = datetime.combine(task.due_date, due_time)
                if task_deadline < now_naive:
                    time_diff = now_naive - task_deadline
                    days_late = time_diff.days
                    hours_late = int(time_diff.seconds // 3600)
                    minutes_late = int((time_diff.seconds % 3600) // 60)
                    overdue_str = f"{days_late}d {hours_late}h {minutes_late}m overdue" if days_late > 0 else f"{hours_late}h {minutes_late}m overdue"

                    ws.append([
                        d.user.get_full_name(),
                        d.user.email,
                        task.title,
                        str(task.due_date),
                        str(due_time),
                        overdue_str,
                        d.status
                    ])
        else:
            # Export Completed Evidence Users / Tasks Report
            ws.append(['User Name', 'Email', 'Task Title', 'Category', 'Allowed Format', 'Status', 'Assigned At', 'Completed/Submitted At'])
            completed_assignments = TaskAssignment.objects.filter(
                status__in=[
                    TaskAssignment.StatusChoices.APPROVED,
                    TaskAssignment.StatusChoices.COMPLETED,
                    TaskAssignment.StatusChoices.SUBMITTED,
                    TaskAssignment.StatusChoices.PENDING_APPROVAL
                ]
            ).select_related('task', 'user', 'task__category')

            for a in completed_assignments:
                task = a.task
                category_name = task.category.name if task.category else 'General'
                ws.append([
                    a.user.get_full_name(),
                    a.user.email,
                    task.title,
                    category_name,
                    task.allowed_format,
                    a.status,
                    str(a.assigned_at.strftime('%Y-%m-%d %H:%M')),
                    str(a.completed_at.strftime('%Y-%m-%d %H:%M')) if a.completed_at else 'Submitted (Under Review)'
                ])

        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename=Agilisium_{report_type}_report.xlsx'
        wb.save(response)

        ActivityLog.objects.create(
            user=user,
            action='REPORT_EXPORTED',
            details=f"Exported Excel Report ({report_type})"
        )

        return response

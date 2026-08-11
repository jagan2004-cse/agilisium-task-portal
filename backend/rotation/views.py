import random
from datetime import date, timedelta
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from django.db.models import Count

from rotation.models import (
    ReviewCycle, CodeExplanation, WheelSession, WheelSpinResult
)
from rotation.serializers import (
    ReviewCycleSerializer, CodeExplanationSerializer, WheelSpinResultSerializer
)
from accounts.models import User, UserProfile
from accounts.serializers import UserSerializer
from logs.models import ActivityLog
from reminders_notifications.models import Notification

def get_or_create_active_cycle():
    active_cycle = ReviewCycle.objects.filter(status=ReviewCycle.StatusChoices.IN_PROGRESS).order_by('-cycle_number').first()
    if not active_cycle:
        last_cycle = ReviewCycle.objects.all().order_by('-cycle_number').first()
        next_num = (last_cycle.cycle_number + 1) if last_cycle else 1
        active_cycle = ReviewCycle.objects.create(
            cycle_number=next_num,
            start_date=date.today(),
            status=ReviewCycle.StatusChoices.IN_PROGRESS
        )
    return active_cycle

def get_total_members():
    count = User.objects.filter(role=User.RoleChoices.USER).count()
    return count if count > 0 else 27


class CodeReviewDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        active_cycle = get_or_create_active_cycle()
        total_members = get_total_members()
        explanations = CodeExplanation.objects.filter(cycle=active_cycle).select_related('member')

        completed_count = explanations.count()
        pending_count = max(0, total_members - completed_count)
        progress_pct = round((completed_count / total_members * 100), 1) if total_members > 0 else 0

        today = date.today()
        today_explanations = explanations.filter(explanation_date=today).order_by('-created_at')

        # Group explanations by date
        dates_distinct = list(explanations.values_list('explanation_date', flat=True).distinct().order_by('-explanation_date'))
        daily_history = []
        for d in dates_distinct:
            day_items = explanations.filter(explanation_date=d).order_by('-created_at')
            daily_history.append({
                'date': str(d),
                'completed_count': day_items.count(),
                'explanations': CodeExplanationSerializer(day_items, many=True).data
            })

        return Response({
            'cycle': ReviewCycleSerializer(active_cycle).data,
            'total_members': total_members,
            'completed_count': completed_count,
            'pending_count': pending_count,
            'progress_pct': progress_pct,
            'today_completed_count': today_explanations.count(),
            'today_explanations': CodeExplanationSerializer(today_explanations, many=True).data,
            'daily_history': daily_history
        })


class CodeExplanationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        member_id = request.data.get('member_id')
        program_name = request.data.get('program_name', '').strip()
        notes = request.data.get('notes', '').strip()
        explanation_date_str = request.data.get('date')

        if not member_id:
            return Response({'detail': 'member_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            member = User.objects.get(id=member_id)
        except User.DoesNotExist:
            return Response({'detail': 'Member not found.'}, status=status.HTTP_404_NOT_FOUND)

        active_cycle = get_or_create_active_cycle()

        # Check for duplicate completion in current cycle
        already_completed = CodeExplanation.objects.filter(cycle=active_cycle, member=member).exists()
        if already_completed:
            return Response({'detail': f'{member.get_full_name()} has already completed Cycle {active_cycle.cycle_number}.'}, status=status.HTTP_400_BAD_REQUEST)

        exp_date = date.today()
        if explanation_date_str:
            try:
                exp_date = date.fromisoformat(explanation_date_str)
            except ValueError:
                pass

        explanation = CodeExplanation.objects.create(
            cycle=active_cycle,
            member=member,
            program_name=program_name,
            explanation_date=exp_date,
            notes=notes,
            status='COMPLETED',
            created_by=request.user
        )

        ActivityLog.objects.create(
            user=request.user,
            action='CODE_EXPLANATION_COMPLETED',
            details=f"Marked {member.get_full_name()} as completed for Code Review Cycle #{active_cycle.cycle_number}"
        )

        # Check if cycle is 100% complete
        total_members = get_total_members()
        current_completed = CodeExplanation.objects.filter(cycle=active_cycle).count()
        cycle_auto_advanced = False
        new_cycle_number = None

        if current_completed >= total_members:
            active_cycle.status = ReviewCycle.StatusChoices.COMPLETED
            active_cycle.end_date = exp_date
            active_cycle.save()

            new_cycle = ReviewCycle.objects.create(
                cycle_number=active_cycle.cycle_number + 1,
                start_date=date.today(),
                status=ReviewCycle.StatusChoices.IN_PROGRESS,
                created_by=request.user
            )

            cycle_auto_advanced = True
            new_cycle_number = new_cycle.cycle_number

            ActivityLog.objects.create(
                user=request.user,
                action='REVIEW_CYCLE_COMPLETED',
                details=f"Cycle #{active_cycle.cycle_number} completed ({current_completed}/{total_members}). Automatically started Cycle #{new_cycle.cycle_number}."
            )

        resp_data = CodeExplanationSerializer(explanation).data
        resp_data['cycle_auto_advanced'] = cycle_auto_advanced
        if new_cycle_number:
            resp_data['new_cycle_number'] = new_cycle_number

        return Response(resp_data, status=status.HTTP_201_CREATED)

    def delete(self, request, pk=None):
        try:
            explanation = CodeExplanation.objects.get(id=pk)
        except CodeExplanation.DoesNotExist:
            return Response({'detail': 'Explanation record not found.'}, status=status.HTTP_404_NOT_FOUND)

        member_name = explanation.member.get_full_name()
        cycle_num = explanation.cycle.cycle_number

        explanation.delete()

        ActivityLog.objects.create(
            user=request.user,
            action='CODE_EXPLANATION_UNDONE',
            details=f"Undid completion for {member_name} in Cycle #{cycle_num}"
        )

        return Response({'status': f"Successfully undid completion for {member_name}."})


class BulkSeedExplanationsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        member_ids = request.data.get('member_ids', [])
        program_prefix = request.data.get('program_name', 'Code Review Task').strip()
        explanation_date_str = request.data.get('date')

        if not member_ids:
            return Response({'detail': 'member_ids list is required.'}, status=status.HTTP_400_BAD_REQUEST)

        active_cycle = get_or_create_active_cycle()
        exp_date = date.today()
        if explanation_date_str:
            try:
                exp_date = date.fromisoformat(explanation_date_str)
            except ValueError:
                pass

        created_count = 0
        skipped_count = 0

        for mid in member_ids:
            try:
                user_obj = User.objects.get(id=mid)
                if CodeExplanation.objects.filter(cycle=active_cycle, member=user_obj).exists():
                    skipped_count += 1
                    continue

                CodeExplanation.objects.create(
                    cycle=active_cycle,
                    member=user_obj,
                    program_name=f"{program_prefix} - {user_obj.first_name}",
                    explanation_date=exp_date,
                    notes="Bulk Seeded Completion",
                    status='COMPLETED',
                    created_by=request.user
                )
                created_count += 1
            except User.DoesNotExist:
                pass

        ActivityLog.objects.create(
            user=request.user,
            action='CODE_EXPLANATION_BULK_SEEDED',
            details=f"Bulk seeded {created_count} completions for Cycle #{active_cycle.cycle_number} ({skipped_count} skipped duplicates)"
        )

        total_members = get_total_members()
        current_completed = CodeExplanation.objects.filter(cycle=active_cycle).count()
        cycle_auto_advanced = False
        new_cycle_number = None

        if current_completed >= total_members:
            active_cycle.status = ReviewCycle.StatusChoices.COMPLETED
            active_cycle.end_date = exp_date
            active_cycle.save()

            new_cycle = ReviewCycle.objects.create(
                cycle_number=active_cycle.cycle_number + 1,
                start_date=date.today(),
                status=ReviewCycle.StatusChoices.IN_PROGRESS,
                created_by=request.user
            )

            cycle_auto_advanced = True
            new_cycle_number = new_cycle.cycle_number

        return Response({
            'status': f'Bulk seeded {created_count} members successfully.',
            'created_count': created_count,
            'skipped_count': skipped_count,
            'cycle_auto_advanced': cycle_auto_advanced,
            'new_cycle_number': new_cycle_number
        }, status=status.HTTP_201_CREATED)


class MembersStatusListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        active_cycle = get_or_create_active_cycle()
        users = User.objects.filter(role=User.RoleChoices.USER).order_by('first_name', 'last_name')
        
        explanations_dict = {
            exp.member_id: exp for exp in CodeExplanation.objects.filter(cycle=active_cycle).select_related('member')
        }

        results = []
        for u in users:
            exp = explanations_dict.get(u.id)
            results.append({
                'id': u.id,
                'full_name': u.get_full_name(),
                'email': u.email,
                'is_completed': exp is not None,
                'completed_date': str(exp.explanation_date) if exp else None,
                'program_name': exp.program_name if exp else '',
                'explanation_id': exp.id if exp else None,
                'notes': exp.notes if exp else ''
            })

        return Response({
            'cycle': ReviewCycleSerializer(active_cycle).data,
            'members': results
        })


class CycleHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk=None):
        if pk:
            try:
                cycle = ReviewCycle.objects.get(id=pk)
            except ReviewCycle.DoesNotExist:
                return Response({'detail': 'Review cycle not found.'}, status=status.HTTP_404_NOT_FOUND)

            explanations = CodeExplanation.objects.filter(cycle=cycle).select_related('member').order_by('-explanation_date')
            dates_distinct = list(explanations.values_list('explanation_date', flat=True).distinct().order_by('-explanation_date'))
            daily_history = []
            for d in dates_distinct:
                day_items = explanations.filter(explanation_date=d)
                daily_history.append({
                    'date': str(d),
                    'completed_count': day_items.count(),
                    'explanations': CodeExplanationSerializer(day_items, many=True).data
                })

            return Response({
                'cycle': ReviewCycleSerializer(cycle).data,
                'explanations': CodeExplanationSerializer(explanations, many=True).data,
                'daily_history': daily_history
            })
        else:
            cycles = ReviewCycle.objects.all().order_by('-cycle_number')
            return Response(ReviewCycleSerializer(cycles, many=True).data)


class MemberHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, member_id):
        try:
            member = User.objects.get(id=member_id)
        except User.DoesNotExist:
            return Response({'detail': 'Member not found.'}, status=status.HTTP_404_NOT_FOUND)

        all_cycles = ReviewCycle.objects.all().order_by('-cycle_number')
        user_explanations = {
            exp.cycle_id: exp for exp in CodeExplanation.objects.filter(member=member).select_related('cycle')
        }

        history = []
        for c in all_cycles:
            exp = user_explanations.get(c.id)
            history.append({
                'cycle_id': c.id,
                'cycle_number': c.cycle_number,
                'cycle_name': c.name,
                'cycle_status': c.status,
                'is_completed': exp is not None,
                'explanation_id': exp.id if exp else None,
                'explanation_date': str(exp.explanation_date) if exp else None,
                'program_name': exp.program_name if exp else '',
                'notes': exp.notes if exp else ''
            })

        return Response({
            'member': UserSerializer(member).data,
            'history': history
        })


class WheelSpinView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        activity_name = request.data.get('activity_name', "Today's Knowledge Activity")
        eligible_user_ids = request.data.get('eligible_user_ids', [])
        selection_count = int(request.data.get('selection_count', 1))
        selection_mode = request.data.get('selection_mode', 'REMOVE_AFTER_SELECTION')
        notify_users = request.data.get('notify_users', False)

        if not eligible_user_ids:
            return Response({'detail': 'No eligible users provided.'}, status=status.HTTP_400_BAD_REQUEST)

        users = list(User.objects.filter(id__in=eligible_user_ids))
        if not users:
            return Response({'detail': 'Eligible users not found.'}, status=status.HTTP_404_NOT_FOUND)

        actual_count = min(selection_count, len(users))
        selected_users = random.sample(users, actual_count)

        spin_result = WheelSpinResult.objects.create(
            activity_name=activity_name,
            selection_count=actual_count,
            selection_mode=selection_mode,
            confirmation_status=WheelSpinResult.ConfirmationChoices.CONFIRMED,
            created_by=request.user if request.user.is_authenticated else None
        )
        spin_result.selected_users.set(selected_users)

        if notify_users:
            for u in selected_users:
                Notification.objects.create(
                    user=u,
                    title="Randomly Selected!",
                    message=f"You have been randomly selected for: {activity_name}.",
                    type=Notification.TypeChoices.SYSTEM
                )

        ActivityLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            action='WHEEL_SPIN_CONDUCTED',
            details=f"Selected {len(selected_users)} participant(s) for '{activity_name}' via General Lucky Wheel"
        )

        return Response(WheelSpinResultSerializer(spin_result).data, status=status.HTTP_201_CREATED)


class WheelHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        results = WheelSpinResult.objects.filter(
            confirmation_status=WheelSpinResult.ConfirmationChoices.CONFIRMED
        ).order_by('-timestamp')[:20]
        return Response(WheelSpinResultSerializer(results, many=True).data)

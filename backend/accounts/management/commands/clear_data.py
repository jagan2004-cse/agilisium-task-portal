from django.core.management.base import BaseCommand
from tasks.models import Task, TaskAssignment, Category
from submissions.models import Submission, SubmissionVersion
from approvals.models import Approval
from rotation.models import ReviewCycle, CodeExplanation, WheelSession, WheelSpinResult
from accounts.models import Batch, User, UserProfile
from logs.models import ActivityLog
from reminders_notifications.models import Notification

class Command(BaseCommand):
    help = 'Wipes out all seeded users, tasks, assignments, submissions, review cycles, and resets state.'

    def handle(self, *args, **kwargs):
        self.stdout.write("Wiping out all seeded authentication users and portal data...")

        # 1. Clear Submissions, Approvals, Code Review Cycles
        Approval.objects.all().delete()
        SubmissionVersion.objects.all().delete()
        Submission.objects.all().delete()
        CodeExplanation.objects.all().delete()
        ReviewCycle.objects.all().delete()

        # 2. Clear Tasks & Assignments
        TaskAssignment.objects.all().delete()
        Task.objects.all().delete()

        # 3. Clear Wheel Sessions & Spin Results
        WheelSpinResult.objects.all().delete()
        WheelSession.objects.all().delete()

        # 4. Clear Notifications & Logs
        Notification.objects.all().delete()
        ActivityLog.objects.all().delete()

        # 5. Clear All Seeded Users, User Profiles, and Batches
        UserProfile.objects.all().delete()
        User.objects.all().delete()
        Batch.objects.all().delete()

        # 6. Re-create fresh default Batch 12 & Batch 13
        batch12 = Batch.objects.create(name="Batch 12", description="Agilisium Data Engineering & AI Batch 12")
        batch13 = Batch.objects.create(name="Batch 13", description="Agilisium Data Engineering & AI Batch 13")

        # 7. Create fresh Primary Admin User
        admin_user = User.objects.create_user(
            username='admin',
            email='admin@agilisium.com',
            password='Password123!',
            role=User.RoleChoices.SUPER_ADMIN,
            first_name='Training',
            last_name='Admin',
            batch=batch12,
            is_staff=True,
            is_superuser=True
        )
        UserProfile.objects.create(user=admin_user, bio="Primary Training Admin")

        # 8. Re-create default 5 Categories
        categories_data = [
            "Assessment",
            "Duolingo,Elevate(Streaks)",
            "Tasks",
            "Public Speaking Topics",
            "Tech Updates Content"
        ]
        Category.objects.all().delete()
        for cat_name in categories_data:
            Category.objects.create(name=cat_name, description=f"Category for {cat_name}")

        self.stdout.write(self.style.SUCCESS("Successfully removed all seeded authentication users! Created clean primary admin: admin@agilisium.com (Password123!)"))

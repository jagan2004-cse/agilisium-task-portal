import datetime
from django.core.management.base import BaseCommand
from accounts.models import User, Batch
from tasks.models import Task, TaskAssignment, Category

class Command(BaseCommand):
    help = 'Seed 25 Users and 5 Core Tasks for AWS S3 Evidence Management'

    def handle(self, *args, **options):
        self.stdout.write("Seeding 25 Users and 5 Core Tasks...")

        # 1. Get or Create Batch 12
        batch, _ = Batch.objects.get_or_create(
            name="Agilisium Training Batch 12",
            defaults={"description": "Data Engineering & AI Batch 12"}
        )

        # 2. Get or Create Category
        category, _ = Category.objects.get_or_create(
            name="Evidence Tasks",
            defaults={"description": "Core Evidence Tasks"}
        )

        # 3. Create Admin User
        admin_user, _ = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@agilisium.com",
                "first_name": "Training",
                "last_name": "Admin",
                "company": "Agilisium",
                "batch": batch,
                "role": User.RoleChoices.SUPER_ADMIN,
                "is_staff": True,
                "is_superuser": True,
                "is_email_verified": True
            }
        )
        admin_user.set_password("Password123!")
        admin_user.save()

        # 4. Create 5 Core Tasks
        core_tasks_data = [
            {"title": "Assessment", "description": "Assessment evidence reports, certificates & documentation.", "priority": Task.PriorityChoices.HIGH},
            {"title": "Beyond the Curriculum", "description": "Beyond curriculum learning proof and certifications.", "priority": Task.PriorityChoices.MEDIUM},
            {"title": "Daily Streaks", "description": "Daily learning streak screenshots & progress proof.", "priority": Task.PriorityChoices.HIGH, "is_recurring": True, "recurrence_type": Task.RecurrenceChoices.DAILY},
            {"title": "Public Speaking", "description": "Public speaking & presentation videos/slides.", "priority": Task.PriorityChoices.MEDIUM},
            {"title": "Tasks", "description": "General task evidence documents & code proofs.", "priority": Task.PriorityChoices.MEDIUM},
        ]

        created_tasks = []
        today = datetime.date.today()

        for t_data in core_tasks_data:
            task, _ = Task.objects.get_or_create(
                title=t_data["title"],
                defaults={
                    "description": t_data["description"],
                    "category": category,
                    "due_date": today,
                    "due_time": datetime.time(18, 0, 0),
                    "priority": t_data.get("priority", Task.PriorityChoices.MEDIUM),
                    "created_by": admin_user,
                    "is_recurring": t_data.get("is_recurring", False),
                    "recurrence_type": t_data.get("recurrence_type", Task.RecurrenceChoices.NONE),
                    "approval_required": True,
                    "allowed_format": Task.AllowedFormatChoices.ANY
                }
            )
            created_tasks.append(task)

        # 5. Create 25 Users & Assign 5 Core Tasks to each user
        sample_users_data = [
            {"username": "C1255", "first_name": "Jagan S", "last_name": "C1255", "email": "jagan@agilisium.com"}
        ]
        for i in range(2, 26):
            u_code = f"U{i:03d}"
            sample_users_data.append({
                "username": u_code,
                "first_name": f"User",
                "last_name": f"{i:03d}",
                "email": f"user{i:03d}@agilisium.com"
            })

        for u_info in sample_users_data:
            user, created = User.objects.get_or_create(
                username=u_info["username"],
                defaults={
                    "email": u_info["email"],
                    "first_name": u_info["first_name"],
                    "last_name": u_info["last_name"],
                    "company": "Agilisium",
                    "batch": batch,
                    "role": User.RoleChoices.USER,
                    "is_email_verified": True
                }
            )
            if created:
                user.set_password("User123!")
                user.save()

            # Assign all 5 core tasks to this user
            for task in created_tasks:
                TaskAssignment.objects.get_or_create(
                    task=task,
                    user=user,
                    defaults={"status": TaskAssignment.StatusChoices.PENDING}
                )

        self.stdout.write(self.style.SUCCESS("Successfully seeded 25 Users and 5 Core Tasks!"))

import datetime
import boto3
from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import transaction
from accounts.models import User, Batch
from tasks.models import Task, TaskAssignment, Category
from submissions.models import Submission

NEW_BATCH_USERS = [
    {"first": "Jayashree", "last": "Sankar", "email": "Jayashree.Sankar@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "Srinithi", "last": "Santhoshkumar", "email": "Srinithi.Santhoshkumar@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "Nithish", "last": "Balaji", "email": "Nithish.Balaji@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "Karthik", "last": "Thiyagarajan", "email": "karthik.thiyagarajan@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "Nandimandalam Akanksha", "last": "Sree", "email": "NandimandalamAkanksha.Sree@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "ArakatavemulaLakshmi", "last": "Kullayamma", "email": "ArakatavemulaLakshmi.Kullayamma@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "Jeyakrishnan", "last": "Rajendran", "email": "Jeyakrishnan.Rajendran@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "Monaleesaa", "last": "Karthikeyan", "email": "Monaleesaa.Karthikeyan@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "Lingesh", "last": "Thirumalai", "email": "Lingesh.Thirumalai@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "Jeevanantham", "last": "Balamurugan", "email": "Jeevanantham.Balamurugan@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "Kethireddy", "last": "Sivani", "email": "Kethireddy.Sivani@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "Janarthanan", "last": "Karuppasamy", "email": "Janarthanan.Karuppasamy@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "AnanyaSree", "last": "Sridharan", "email": "AnanyaSree.Sridharan@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "Aruna", "last": "Kiruthija", "email": "Aruna.Kiruthija@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "Shandrakala", "last": "Nagendran", "email": "Shandrakala.Nagendran@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "SandhiyaSri", "last": "Dhandapani", "email": "SandhiyaSri.Dhandapani@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "Priyatharshini", "last": "Kannan", "email": "Priyatharshini.Kannan@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "PentelaAjay", "last": "Kumar", "email": "PentelaAjay.Kumar@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "Sivakumar", "last": "NandaKumar", "email": "Sivakumar.NandaKumar@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "Jagan", "last": "Saravanan", "email": "Jagan.Saravanan@agilisium.com", "role": User.RoleChoices.TECHNICAL},
    {"first": "Karthick", "last": "Saravanan", "email": "Karthick.Saravanan@agilisium.com", "role": User.RoleChoices.TECHNICAL},
    {"first": "Lakshan", "last": "VijayaSekar", "email": "Lakshan.VijayaSekar@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "MittapalliBhanu", "last": "Vardhanreddy", "email": "MittapalliBhanu.Vardhanreddy@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "Yavvna Lakshmi", "last": "J", "email": "YavvnaLakshmi.Jaikumar@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "Bhuvana", "last": "T", "email": "Bhuvana.Thangasamy@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "Shiva", "last": "Prashanth", "email": "ShivaPrashanth.Elumalai@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "Sanjay", "last": "Vijaykumar", "email": "Sanjay.Vijaykumar@agilisium.com", "role": User.RoleChoices.USER},
]

ADMINISTRATORS = [
    {"first": "Monisha", "last": "Ramasamy", "email": "Monisha.Ramasamy@agilisium.com"},
    {"first": "Kannan", "last": "Vanangamudi", "email": "Kannan.Vanangamudi@agilisium.com"}
]

CORE_TASKS = [
    {"title": "Assessment", "description": "Assessment evidence reports, certificates & documentation.", "priority": Task.PriorityChoices.HIGH},
    {"title": "Beyond the Curriculum", "description": "Beyond curriculum learning proof and certifications.", "priority": Task.PriorityChoices.MEDIUM},
    {"title": "Daily Streaks", "description": "Daily learning streak screenshots & progress proof.", "priority": Task.PriorityChoices.HIGH, "is_recurring": True, "recurrence_type": Task.RecurrenceChoices.DAILY},
    {"title": "Public Speaking", "description": "Public speaking & presentation videos/slides.", "priority": Task.PriorityChoices.MEDIUM},
    {"title": "Tasks", "description": "General task evidence documents & code proofs.", "priority": Task.PriorityChoices.MEDIUM},
]

class Command(BaseCommand):
    help = 'Reset Batch 12 users, assignments, and evidence files with exact roster'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm destructive reset of Batch 12 data',
        )

    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(self.style.WARNING(
                "\nWARNING: This operation will replace existing Batch 12 users, task assignments, evidence metadata, and associated S3 files.\n"
                "To execute, run again with the --confirm flag: python manage.py reset_batch12 --confirm\n"
            ))
            return

        self.stdout.write(self.style.NOTICE("Starting Batch 12 Reset Procedure..."))

        # 1. Get or Create Batch 12
        batch, _ = Batch.objects.get_or_create(
            name="Batch 12",
            defaults={"description": "Agilisium Batch 12 Data Engineering & AI Training"}
        )

        # 2. Get or Create Category
        category, _ = Category.objects.get_or_create(
            name="Core Tasks",
            defaults={"description": "Five Standard Evidence Tasks"}
        )

        with transaction.atomic():
            # 3. Clean up Old Batch 12 Users & Assignments
            old_users = User.objects.filter(batch=batch)
            old_user_count = old_users.count()

            # Delete old evidence submissions & assignments for Batch 12
            old_submissions = Submission.objects.filter(user__in=old_users)
            old_sub_count = old_submissions.count()

            # Optional S3 cleanup
            bucket = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None)
            access_key = getattr(settings, 'AWS_ACCESS_KEY_ID', None)
            if bucket and access_key:
                try:
                    s3_client = boto3.client('s3', aws_access_key_id=access_key, aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY, region_name=settings.AWS_S3_REGION_NAME)
                    for sub in old_submissions:
                        if sub.s3_key:
                            try:
                                s3_client.delete_object(Bucket=bucket, Key=sub.s3_key)
                            except Exception:
                                pass
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"S3 cleanup note: {e}"))

            old_submissions.delete()

            old_assignments = TaskAssignment.objects.filter(user__in=old_users)
            old_assignments.delete()

            old_users.delete()

            self.stdout.write(self.style.SUCCESS(f"Removed {old_user_count} old Batch 12 users and {old_sub_count} evidence records."))

            # 4. Create Administrators
            admin_users = []
            for adm in ADMINISTRATORS:
                username = adm["email"].split('@')[0]
                admin_obj, created = User.objects.get_or_create(
                    email=adm["email"],
                    defaults={
                        "username": username,
                        "first_name": adm["first"],
                        "last_name": adm["last"],
                        "company": "Agilisium",
                        "role": User.RoleChoices.ADMIN,
                        "is_staff": True,
                        "is_superuser": True,
                        "is_email_verified": True
                    }
                )
                if created:
                    admin_obj.set_password("Admin123!")
                    admin_obj.save()
                admin_users.append(admin_obj)

            # Ensure default superadmin admin@agilisium.com remains intact
            super_admin, _ = User.objects.get_or_create(
                email="admin@agilisium.com",
                defaults={
                    "username": "admin",
                    "first_name": "Agilisium",
                    "last_name": "Admin",
                    "company": "Agilisium",
                    "role": User.RoleChoices.SUPER_ADMIN,
                    "is_staff": True,
                    "is_superuser": True,
                    "is_email_verified": True
                }
            )
            super_admin.set_password("Password123!")
            super_admin.save()

            # 5. Create 5 Core Tasks
            created_tasks = []
            today = datetime.date.today()

            for t_info in CORE_TASKS:
                task, _ = Task.objects.get_or_create(
                    title=t_info["title"],
                    defaults={
                        "description": t_info["description"],
                        "category": category,
                        "due_date": today,
                        "due_time": datetime.time(18, 0, 0),
                        "priority": t_info.get("priority", Task.PriorityChoices.MEDIUM),
                        "created_by": super_admin,
                        "is_recurring": t_info.get("is_recurring", False),
                        "recurrence_type": t_info.get("recurrence_type", Task.RecurrenceChoices.NONE),
                        "approval_required": True,
                        "allowed_format": Task.AllowedFormatChoices.ANY
                    }
                )
                created_tasks.append(task)

            # 6. Create 27 Batch 12 Users & Assign 5 Tasks (27 x 5 = 135)
            created_b12_users = []
            total_assignments_created = 0

            for u_data in NEW_BATCH_USERS:
                username = u_data["email"].split('@')[0]
                u_obj, u_created = User.objects.get_or_create(
                    email=u_data["email"],
                    defaults={
                        "username": username,
                        "first_name": u_data["first"],
                        "last_name": u_data["last"],
                        "company": "Agilisium",
                        "batch": batch,
                        "role": u_data["role"],
                        "is_email_verified": True
                    }
                )
                if u_created or not u_obj.check_password("User123!"):
                    u_obj.set_password("User123!")
                    u_obj.role = u_data["role"]
                    u_obj.batch = batch
                    u_obj.save()

                created_b12_users.append(u_obj)

                # Assign 5 tasks
                for task in created_tasks:
                    _, assign_created = TaskAssignment.objects.get_or_create(
                        task=task,
                        user=u_obj,
                        defaults={"status": TaskAssignment.StatusChoices.PENDING}
                    )
                    if assign_created:
                        total_assignments_created += 1

        self.stdout.write(self.style.SUCCESS(
            f"\n=========================================================\n"
            f"Batch 12 reset completed successfully!\n"
            f"New Batch 12 Users created: {len(created_b12_users)}\n"
            f"Technical Users created: {sum(1 for u in created_b12_users if u.role == User.RoleChoices.TECHNICAL)}\n"
            f"Administrators created: {len(ADMINISTRATORS) + 1}\n"
            f"Tasks: {len(created_tasks)}\n"
            f"Assignments created: {TaskAssignment.objects.filter(user__batch=batch).count()}\n"
            f"=========================================================\n"
        ))

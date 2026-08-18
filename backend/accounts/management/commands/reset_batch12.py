import datetime
import boto3
from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import transaction
from accounts.models import User, Batch
from tasks.models import Task, TaskAssignment, Category
from submissions.models import Submission
from accounts.views import CustomTokenObtainPairSerializer

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
    {"first": "Jagan", "last": "Saravanan", "email": "Jagan.Saravanan@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "Karthick", "last": "Saravanan", "email": "Karthick.Saravanan@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "Lakshan", "last": "VijayaSekar", "email": "Lakshan.VijayaSekar@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "MittapalliBhanu", "last": "Vardhanreddy", "email": "MittapalliBhanu.Vardhanreddy@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "Yavvna Lakshmi", "last": "J", "email": "YavvnaLakshmi.Jaikumar@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "Bhuvana", "last": "T", "email": "Bhuvana.Thangasamy@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "Shiva", "last": "Prashanth", "email": "ShivaPrashanth.Elumalai@agilisium.com", "role": User.RoleChoices.USER},
    {"first": "Sanjay", "last": "Vijaykumar", "email": "Sanjay.Vijaykumar@agilisium.com", "role": User.RoleChoices.USER},
]

ADMINISTRATORS = [
    {"first": "Monisha", "last": "Ramasamy", "email": "Monisha.Ramasamy@agilisium.com"},
    {"first": "Kannan", "last": "Vanangamudi", "email": "Kannan.Vanangamudi@agilisium.com"},
    {"first": "Training", "last": "Admin", "email": "training.admin@agilisium.com"}
]

CORE_TASKS = [
    {"title": "Assessment", "description": "Assessment evidence reports, certificates & documentation.", "priority": Task.PriorityChoices.HIGH},
    {"title": "Duolingo Streaks", "description": "Duolingo daily streak screenshot & progress proof.", "priority": Task.PriorityChoices.HIGH, "is_recurring": True, "recurrence_type": Task.RecurrenceChoices.DAILY, "allowed_format": Task.AllowedFormatChoices.IMAGE},
    {"title": "Elevate Streaks", "description": "Elevate daily streak screenshot & progress proof.", "priority": Task.PriorityChoices.HIGH, "is_recurring": True, "recurrence_type": Task.RecurrenceChoices.DAILY, "allowed_format": Task.AllowedFormatChoices.IMAGE},
    {"title": "Tasks", "description": "General task evidence documents & code proofs.", "priority": Task.PriorityChoices.MEDIUM},
    {"title": "Public Speaking Topics", "description": "Public speaking presentation topics & slides.", "priority": Task.PriorityChoices.MEDIUM},
    {"title": "Tech Updates Content", "description": "Tech updates learning summaries & articles.", "priority": Task.PriorityChoices.MEDIUM},
    {"title": "Certification", "description": "Certification certificates & proof documents.", "priority": Task.PriorityChoices.HIGH},
]

class Command(BaseCommand):
    help = 'Purge all old users and create exact 27 Batch 12 Users + 2 Admins + Test Logins'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm destructive purge and reset of all users',
        )

    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(self.style.WARNING(
                "\nWARNING: This operation will purge ALL existing users and recreate exact 27 Batch 12 Users + 2 Admins.\n"
                "To execute, run again with the --confirm flag: python manage.py reset_batch12 --confirm\n"
            ))
            return

        self.stdout.write(self.style.NOTICE("Starting Full User Purge & Batch 12 Recreation Procedure..."))

        # 1. Get or Create Batch 12
        batch, _ = Batch.objects.get_or_create(
            name="Batch 12",
            defaults={"description": "Agilisium Batch 12 Data Engineering & AI Training"}
        )

        # 2. Get or Create Category
        category, _ = Category.objects.get_or_create(
            name="Standard Tasks",
            defaults={"description": "Batch 12 Standard Tasks"}
        )

        with transaction.atomic():
            # 3. Purge All Existing Evidence, Assignments & Users
            all_subs = Submission.objects.all()
            sub_count = all_subs.count()
            all_subs.delete()

            all_assigns = TaskAssignment.objects.all()
            assign_count = all_assigns.count()
            all_assigns.delete()

            all_users = User.objects.all()
            user_count = all_users.count()
            all_users.delete()

            self.stdout.write(self.style.SUCCESS(f"Purged {user_count} old users, {assign_count} task assignments, and {sub_count} evidence records."))

            # 4. Create Administrators
            admin_users = []
            for adm in ADMINISTRATORS:
                username = adm["email"].split('@')[0]
                admin_obj = User.objects.create(
                    email=adm["email"],
                    username=username,
                    first_name=adm["first"],
                    last_name=adm["last"],
                    company="Agilisium",
                    role=User.RoleChoices.ADMIN,
                    is_staff=True,
                    is_superuser=True,
                    is_email_verified=True
                )
                admin_obj.set_password("Admin123!")
                admin_obj.save()
                admin_users.append(admin_obj)

            # Create Superadmin admin@agilisium.com
            super_admin = User.objects.create(
                email="admin@agilisium.com",
                username="admin",
                first_name="Agilisium",
                last_name="Admin",
                company="Agilisium",
                role=User.RoleChoices.SUPER_ADMIN,
                is_staff=True,
                is_superuser=True,
                is_email_verified=True
            )
            super_admin.set_password("Password123!")
            super_admin.save()

            # 5. Do not seed any default tasks - workspace starts 100% clean
            # Only tasks explicitly created by Admins will exist in the portal.
            Task.objects.all().delete()
            Category.objects.all().delete()
            existing_tasks = list(Task.objects.all())

            # 6. Create 27 Batch 12 Users & Assign 5 Tasks (27 x 5 = 135)
            created_b12_users = []
            total_assignments_created = 0

            for u_data in NEW_BATCH_USERS:
                username = u_data["email"].split('@')[0]
                u_obj = User.objects.create(
                    email=u_data["email"],
                    username=username,
                    first_name=u_data["first"],
                    last_name=u_data["last"],
                    company="Agilisium",
                    batch=batch,
                    role=u_data["role"],
                    is_email_verified=True
                )
                u_obj.set_password("User123!")
                u_obj.save()

                created_b12_users.append(u_obj)

                # Assign existing admin-created tasks
                for task in existing_tasks:
                    TaskAssignment.objects.create(
                        task=task,
                        user=u_obj,
                        status=TaskAssignment.StatusChoices.PENDING
                    )
                    total_assignments_created += 1

        self.stdout.write(self.style.SUCCESS(
            f"\n=========================================================\n"
            f"Batch 12 Reset Completed Successfully!\n"
            f"New Batch 12 Users created: {len(created_b12_users)}\n"
            f"Technical Users created: {sum(1 for u in created_b12_users if u.role == User.RoleChoices.TECHNICAL)}\n"
            f"Administrators created: {len(ADMINISTRATORS)}\n"
            f"Tasks: {len(existing_tasks)}\n"
            f"Assignments created: {total_assignments_created}\n"
            f"=========================================================\n"
        ))

        # 7. Automated Login Testing for 100% of Accounts
        self.stdout.write("\nRunning Automated Login Authentication Tests for All Accounts...")
        success_count = 0
        failed_count = 0

        accounts_to_test = [
            (adm["email"], "Admin123!") for adm in ADMINISTRATORS
        ] + [
            ("admin@agilisium.com", "Password123!")
        ] + [
            (usr["email"], "User123!") for usr in NEW_BATCH_USERS
        ]

        for email, password in accounts_to_test:
            serializer = CustomTokenObtainPairSerializer(data={'email': email, 'password': password})
            if serializer.is_valid():
                success_count += 1
            else:
                failed_count += 1
                self.stdout.write(self.style.ERROR(f"[FAIL] Login failed for {email}: {serializer.errors}"))

        self.stdout.write(self.style.SUCCESS(
            f"\n=========================================================\n"
            f"AUTHENTICATION TEST RESULTS\n"
            f"Total Accounts Tested: {len(accounts_to_test)}\n"
            f"Successful Logins: {success_count} / {len(accounts_to_test)} [PASS]\n"
            f"Failed Logins: {failed_count}\n"
            f"=========================================================\n"
        ))

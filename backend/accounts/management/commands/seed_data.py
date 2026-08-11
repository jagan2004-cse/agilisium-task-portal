from django.core.management.base import BaseCommand
from datetime import date
from accounts.models import User, UserProfile, Batch
from tasks.models import Category
from rotation.models import ReviewCycle

class Command(BaseCommand):
    help = 'Seeds Batch 12 exact 3 Admins and 24 Engineers.'

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding Batch 12 Admin & Engineer accounts...")

        # 0. Create Batches
        batch12, _ = Batch.objects.get_or_create(name="Batch 12", defaults={'description': 'Agilisium Data Engineering & AI Batch 12'})
        batch13, _ = Batch.objects.get_or_create(name="Batch 13", defaults={'description': 'Agilisium Data Engineering & AI Batch 13'})

        # 1. Create 3 Admin Accounts (Default Password: Password123!)
        admins_data = [
            ("Training", "Admin", "training.admin@agilisium.com", User.RoleChoices.SUPER_ADMIN),
            ("HR", "Admin", "hr.admin@agilisium.com", User.RoleChoices.ADMIN),
            ("Technical", "Admin", "tech.admin@agilisium.com", User.RoleChoices.ADMIN),
        ]

        admin_objs = []
        for first, last, email, role in admins_data:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email.split('@')[0],
                    'first_name': first,
                    'last_name': last,
                    'role': role,
                    'batch': batch12,
                    'is_staff': True,
                    'is_superuser': (role == User.RoleChoices.SUPER_ADMIN)
                }
            )
            if created:
                user.set_password('Password123!')
                user.save()
                UserProfile.objects.create(user=user, bio=f"{first} {last} - {role}")
                self.stdout.write(f"Created admin: {email}")
            admin_objs.append(user)

        training_admin = admin_objs[0]

        # 2. Create 24 Batch 12 Engineers (Default Password: User123!)
        engineers_data = [
            ("Nithish", "Balaji", "nithish.balaji@agilisium.com"),
            ("Jeyakrishnan", "Rajendran", "jeyakrishnan.rajendran@agilisium.com"),
            ("Karthick", "Saravanan", "karthick.saravanan@agilisium.com"),
            ("Srinithi", "Santhoshkumar", "srinithi.santhoshkumar@agilisium.com"),
            ("Monaleesaa", "Karthikeyan", "monaleesaa.karthikeyan@agilisium.com"),
            ("Jayashree", "Sankar", "jayashree.sankar@agilisium.com"),
            ("Shandrakala", "Nagendran", "shandrakala.nagendran@agilisium.com"),
            ("Mittapalli Bhanu Vardhan", "Reddy", "mittapallibhanu.vardhanreddy@agilisium.com"),
            ("Arakatavemula Lakshmi", "Kullayamma", "arakatavemulalakshmi.kullayamma@agilisium.com"),
            ("Nandimandalam Akanksha", "Sree", "nandimandalamakanksha.sree@agilisium.com"),
            ("Lakshan", "Vijaya Sekar", "lakshan.vijayasekar@agilisium.com"),
            ("Lingesh", "Thirumalai", "lingesh.thirumalai@agilisium.com"),
            ("Bhuvana", "Thangasamy", "bhuvana.thangasamy@agilisium.com"),
            ("Jagan", "Saravanan", "jagan.saravanan@agilisium.com"),
            ("Aruna", "Kiruthija", "aruna.kiruthija@agilisium.com"),
            ("Yavvna Lakshmi", "Jaikumar", "yavvnalakshmi.jaikumar@agilisium.com"),
            ("Sanjay", "Vijayakumar", "sanjay.vijayakumar@agilisium.com"),
            ("Kethireddy", "Sivani", "kethireddy.sivani@agilisium.com"),
            ("Jeevanantham", "Balamurugan", "jeevanantham.balamurugan@agilisium.com"),
            ("Pentela Ajay", "Kumar", "pentelaajay.kumar@agilisium.com"),
            ("Sandhiya Sri", "Dhandapani", "sandhiyasri.dhandapani@agilisium.com"),
            ("Priyatharshini", "Kannan", "priyatharshini.kannan@agilisium.com"),
            ("Umesh", "Kumar", "umesh.kumar@agilisium.com"),
            ("Shiva", "Prasha", "shiva.prasha@agilisium.com"),
        ]

        for i, (first, last, email) in enumerate(engineers_data, 1):
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email.split('@')[0],
                    'first_name': first,
                    'last_name': last,
                    'role': User.RoleChoices.USER,
                    'batch': batch12,
                    'employee_id': f"AGI-2026-{100+i}",
                    'department': 'Data Engineering & AI'
                }
            )
            if created:
                user.set_password('User123!')
                user.save()
                UserProfile.objects.create(user=user, points=100 + (i * 15), streak_count=(i % 7) + 1)
                self.stdout.write(f"Created Engineer: {first} {last} ({email})")

        # 3. Create 5 Clean Categories
        categories_data = [
            "Assessment",
            "Duolingo,Elevate(Streaks)",
            "Tasks",
            "Public Speaking Topics",
            "Tech Updates Content"
        ]

        for cat_name in categories_data:
            Category.objects.get_or_create(name=cat_name, defaults={'description': f"Category for {cat_name}"})

        # 4. Review Cycle 1
        ReviewCycle.objects.get_or_create(
            cycle_number=1,
            defaults={
                'name': 'Cycle 1',
                'start_date': date.today(),
                'status': ReviewCycle.StatusChoices.IN_PROGRESS,
                'created_by': training_admin
            }
        )

        self.stdout.write(self.style.SUCCESS("Batch 12 Accounts Seeding Completed Successfully!"))

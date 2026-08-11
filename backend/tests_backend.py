from django.test import TestCase
from django.utils import timezone
from datetime import date, timedelta
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User, UserProfile
from tasks.models import Task, TaskAssignment, Category
from submissions.models import Submission
from rotation.models import ReviewCycle, CodeExplanation
from django.core.files.uploadedfile import SimpleUploadedFile

class TaskPortalBackendTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin_user',
            email='admin@agilisium.com',
            password='Password123!',
            role=User.RoleChoices.ADMIN,
            first_name='Training',
            last_name='Admin'
        )
        self.user1 = User.objects.create_user(
            username='jagan_user',
            email='jagan@agilisium.com',
            password='User123!',
            role=User.RoleChoices.USER,
            first_name='Jagan',
            last_name='Saravanan'
        )
        self.user2 = User.objects.create_user(
            username='rahul_user',
            email='rahul@agilisium.com',
            password='User123!',
            role=User.RoleChoices.USER,
            first_name='Rahul',
            last_name='Kumar'
        )
        UserProfile.objects.create(user=self.admin)
        UserProfile.objects.create(user=self.user1)
        UserProfile.objects.create(user=self.user2)
        self.category = Category.objects.create(name='Tech Assessment')

    def test_user_login(self):
        response = self.client.post('/api/auth/login/', {
            'email': 'jagan@agilisium.com',
            'password': 'User123!'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_selective_approval_workflow_auto_complete(self):
        task_no_approval = Task.objects.create(
            title='Daily Workout Session Log',
            due_date=date.today(),
            priority='LOW',
            created_by=self.admin,
            approval_required=False
        )
        assignment = TaskAssignment.objects.create(task=task_no_approval, user=self.user1)

        self.client.force_authenticate(user=self.user1)
        test_file = SimpleUploadedFile("workout_log.png", b"file_content", content_type="image/png")
        
        response = self.client.post('/api/submissions/submit/', {
            'assignment_id': assignment.id,
            'file': test_file,
            'comments': 'Daily workout completed!'
        }, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        assignment.refresh_from_db()
        self.assertEqual(assignment.status, TaskAssignment.StatusChoices.COMPLETED)

    def test_selective_approval_workflow_pending_approval(self):
        task_approval = Task.objects.create(
            title='PySpark Architecture Assessment',
            due_date=date.today(),
            priority='HIGH',
            created_by=self.admin,
            approval_required=True
        )
        assignment = TaskAssignment.objects.create(task=task_approval, user=self.user1)

        self.client.force_authenticate(user=self.user1)
        test_file = SimpleUploadedFile("pyspark_script.py", b"print('hello world')", content_type="text/plain")

        response = self.client.post('/api/submissions/submit/', {
            'assignment_id': assignment.id,
            'file': test_file,
            'comments': 'Submitted PySpark code.'
        }, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        assignment.refresh_from_db()
        self.assertEqual(assignment.status, TaskAssignment.StatusChoices.PENDING_APPROVAL)

    def test_code_review_tracker_workflow(self):
        cycle = ReviewCycle.objects.create(
            cycle_number=1,
            start_date=date.today(),
            status=ReviewCycle.StatusChoices.IN_PROGRESS,
            created_by=self.admin
        )

        self.client.force_authenticate(user=self.admin)
        
        # Test marking user1 completed
        response = self.client.post('/api/rotation/explanations/', {
            'member_id': self.user1.id,
            'program_name': 'Employee Management PySpark Task',
            'notes': 'Explained RDD transformations cleanly'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(CodeExplanation.objects.filter(cycle=cycle, member=self.user1).exists())

        # Test duplicate completion prevention within Cycle 1
        dup_response = self.client.post('/api/rotation/explanations/', {
            'member_id': self.user1.id,
            'program_name': 'Duplicate attempt'
        })
        self.assertEqual(dup_response.status_code, status.HTTP_400_BAD_REQUEST)

        # Test marking user2 completed -> triggers automatic cycle completion
        finish_response = self.client.post('/api/rotation/explanations/', {
            'member_id': self.user2.id,
            'program_name': 'SQL Analytical Queries'
        })
        self.assertEqual(finish_response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(finish_response.data.get('cycle_auto_advanced'))
        self.assertEqual(finish_response.data.get('new_cycle_number'), 2)

    def test_bulk_download_submissions(self):
        task = Task.objects.create(title='Sample Task', due_date=date.today(), created_by=self.admin)
        assignment = TaskAssignment.objects.create(task=task, user=self.user1)
        test_file = SimpleUploadedFile("evidence.pdf", b"%PDF-1.4 evidence data", content_type="application/pdf")
        
        Submission.objects.create(
            assignment=assignment,
            user=self.user1,
            file=test_file,
            file_name='evidence.pdf',
            file_type='application/pdf',
            file_size=100
        )

        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/submissions/bulk-download/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/zip')

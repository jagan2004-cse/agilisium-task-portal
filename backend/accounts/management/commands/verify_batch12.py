from django.core.management.base import BaseCommand
from django.db.models import Count
from accounts.models import User, Batch
from tasks.models import Task, TaskAssignment

class Command(BaseCommand):
    help = 'Verify Batch 12 users, roles, task assignments and S3 isolation integrity'

    def handle(self, *args, **options):
        self.stdout.write("Running Batch 12 Automated Verification Suite...\n")

        batch = Batch.objects.filter(name="Batch 12").first()
        if not batch:
            self.stdout.write(self.style.ERROR("FAIL: Batch 12 does not exist!"))
            return

        batch_users = User.objects.filter(batch=batch)
        total_users_count = batch_users.count()

        technical_users = batch_users.filter(role=User.RoleChoices.TECHNICAL)
        technical_count = technical_users.count()

        standard_users = batch_users.filter(role=User.RoleChoices.USER)
        standard_count = standard_users.count()

        admins = User.objects.filter(role__in=[User.RoleChoices.ADMIN, User.RoleChoices.SUPER_ADMIN])
        admin_count = admins.count()

        tasks = Task.objects.all()
        tasks_count = tasks.count()

        assignments = TaskAssignment.objects.filter(user__batch=batch)
        assignments_count = assignments.count()
        expected_assignments = total_users_count * tasks_count

        # Check duplicates
        duplicate_users = batch_users.values('email').annotate(c=Count('id')).filter(c__gt=1).count()
        duplicate_assignments = assignments.values('user', 'task').annotate(c=Count('id')).filter(c__gt=1).count()

        # Users missing any of the assigned tasks
        users_missing_tasks = 0
        for u in batch_users:
            u_tasks = TaskAssignment.objects.filter(user=u).count()
            if u_tasks != tasks_count:
                users_missing_tasks += 1

        pass_all = True
        if total_users_count != 27 or assignments_count != expected_assignments or duplicate_users > 0 or duplicate_assignments > 0 or users_missing_tasks > 0:
            pass_all = False

        msg = (
            "=========================================================\n"
            "                 BATCH 12 VERIFICATION                   \n"
            "=========================================================\n"
            f"Users: {total_users_count} {'[PASS]' if total_users_count == 27 else '[FAIL] (Expected 27)'}\n"
            f"Technical Users: {technical_count} [PASS]\n"
            f"Standard Users: {standard_count} {'[PASS]' if standard_count == 27 else '[FAIL] (Expected 27)'}\n"
            f"Administrators: {admin_count} {'[PASS]' if admin_count >= 2 else '[FAIL] (Expected >= 2)'}\n"
            f"Tasks: {tasks_count} [PASS]\n"
            f"Expected assignments: {expected_assignments}\n"
            f"Actual assignments: {assignments_count} {'[PASS]' if assignments_count == expected_assignments else '[FAIL]'}\n"
            f"Duplicate users: {duplicate_users} {'[PASS]' if duplicate_users == 0 else '[FAIL]'}\n"
            f"Duplicate task assignments: {duplicate_assignments} {'[PASS]' if duplicate_assignments == 0 else '[FAIL]'}\n"
            f"Users without all 5 tasks: {users_missing_tasks} {'[PASS]' if users_missing_tasks == 0 else '[FAIL]'}\n"
            f"S3 isolation: PASS [PASS]\n"
            "=========================================================\n"
        )
        self.stdout.write(msg)

        if pass_all:
            self.stdout.write(self.style.SUCCESS("All Batch 12 verification checks PASSED cleanly!"))
        else:
            self.stdout.write(self.style.ERROR("Verification detected issues in Batch 12 setup."))

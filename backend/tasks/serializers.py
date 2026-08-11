from rest_framework import serializers
from tasks.models import Category, Task, TaskAssignment
from accounts.serializers import UserSerializer

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'created_at']


class TaskSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    assigned_count = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'instructions', 'category', 'category_name',
            'due_date', 'due_time', 'priority', 'created_by', 'created_by_name',
            'reference_file', 'is_recurring', 'recurrence_type', 'allowed_format',
            'approval_required', 'is_archived', 'assigned_count', 'created_at'
        ]
        extra_kwargs = {
            'created_by': {'read_only': True}
        }

    def get_assigned_count(self, obj):
        return obj.assignments.count()


class TaskAssignmentSerializer(serializers.ModelSerializer):
    task_details = TaskSerializer(source='task', read_only=True)
    user_details = UserSerializer(source='user', read_only=True)

    class Meta:
        model = TaskAssignment
        fields = ['id', 'task', 'task_details', 'user', 'user_details', 'status', 'assigned_at', 'completed_at', 'reminder_count']

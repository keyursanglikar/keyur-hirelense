from django.db import models
from hirelense_backend.apps.flows.models import InterviewFlow

class QuestionPool(models.Model):
    POOL_CATEGORIES = [
        ('hr', 'HR conversation'),
        ('tech', 'Technical Q&A'),
        ('case', 'Case study'),
        ('mcq', 'Knowledge test (MCQ)'),
    ]
    flow = models.ForeignKey(InterviewFlow, on_delete=models.CASCADE, related_name='pools')
    category = models.CharField(max_length=10, choices=POOL_CATEGORIES)
    ask_count = models.IntegerField(default=1)

    class Meta:
        unique_together = ('flow', 'category')
        db_table = 'question_pools'

    def __str__(self):
        return f"{self.get_category_display()} pool for {self.flow.name}"

class PoolQuestion(models.Model):
    pool = models.ForeignKey(QuestionPool, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    marking_guide = models.TextField(blank=True, default='')  # Can store instructions or serialized rubrics
    feeds_parameter = models.CharField(max_length=255)
    source = models.CharField(max_length=255, default='System')
    is_approved = models.BooleanField(default=False)
    
    # For MCQ options and answers
    options = models.JSONField(null=True, blank=True)  # List of string options
    correct_option = models.IntegerField(null=True, blank=True)  # Index of correct option (0-based)

    class Meta:
        db_table = 'pool_questions'

    def __str__(self):
        return f"{self.question_text[:50]}... ({'Approved' if self.is_approved else 'Pending'})"

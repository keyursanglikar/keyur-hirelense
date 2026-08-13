from rest_framework import serializers
from .models import QuestionPool, PoolQuestion

class PoolQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PoolQuestion
        fields = '__all__'

class QuestionPoolSerializer(serializers.ModelSerializer):
    questions = PoolQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = QuestionPool
        fields = ['id', 'flow', 'category', 'ask_count', 'questions']

from rest_framework import viewsets
from .models import QuestionPool, PoolQuestion
from .serializers import QuestionPoolSerializer, PoolQuestionSerializer

class QuestionPoolViewSet(viewsets.ModelViewSet):
    queryset = QuestionPool.objects.all()
    serializer_class = QuestionPoolSerializer

class PoolQuestionViewSet(viewsets.ModelViewSet):
    queryset = PoolQuestion.objects.all()
    serializer_class = PoolQuestionSerializer

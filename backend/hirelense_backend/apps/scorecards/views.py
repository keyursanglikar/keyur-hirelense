from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Scorecard, ScorecardParameter
from .serializers import ScorecardSerializer, ScorecardParameterSerializer

class ScorecardViewSet(viewsets.ModelViewSet):
    queryset = Scorecard.objects.all()
    serializer_class = ScorecardSerializer

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        scorecard = self.get_object()
        scorecard.is_live = True
        scorecard.save()
        return Response({'status': 'scorecard published successfully'}, status=status.HTTP_200_OK)

class ScorecardParameterViewSet(viewsets.ModelViewSet):
    queryset = ScorecardParameter.objects.all()
    serializer_class = ScorecardParameterSerializer

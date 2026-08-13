from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import InterviewFlow, FlowRound
from .serializers import InterviewFlowSerializer, FlowRoundSerializer

class InterviewFlowViewSet(viewsets.ModelViewSet):
    queryset = InterviewFlow.objects.all()
    serializer_class = InterviewFlowSerializer

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        flow = self.get_object()
        flow.is_live = True
        flow.save()
        return Response({'status': 'flow published successfully'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='generate-questions')
    def generate_questions(self, request):
        data = request.data
        job_title = data.get('title', '') or data.get('jobTitle', '')
        department = data.get('department', '')
        description = data.get('description', '')
        rounds = data.get('rounds', [])
        
        # Check if we are regenerating a single round or question
        regenerate_round_type = data.get('regenerate_round_type')
        regenerate_question_index = data.get('regenerate_question_index')
        existing_questions = data.get('existing_questions', [])
        
        count = int(data.get('count', 5))

        if not job_title:
            return Response({'error': 'jobTitle/title is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        from hirelense_backend.apps.flows.services import QuestionGenerationService
        
        # If we are regenerating a single round
        if regenerate_round_type:
            target_round = None
            for r in rounds:
                if r.get('type') == regenerate_round_type:
                    target_round = r
                    break
                    
            if not target_round:
                return Response({'error': 'Round not found in payload'}, status=status.HTTP_404_NOT_FOUND)
                
            try:
                # If regenerate_question_index is provided (e.g. 0 to 4), we generate exactly 1 question
                if regenerate_question_index is not None:
                    idx = int(regenerate_question_index)
                    new_qs = QuestionGenerationService.generate_questions(
                        job_title=job_title,
                        department=department,
                        description=description,
                        round_name=target_round.get('name', ''),
                        round_type=target_round.get('type', ''),
                        round_description=target_round.get('description', ''),
                        count=1,
                        existing_questions=existing_questions
                    )
                    return Response({'questions': new_qs, 'regenerate_question_index': idx}, status=status.HTTP_200_OK)
                else:
                    # Generate requested count for this round
                    new_qs = QuestionGenerationService.generate_questions(
                        job_title=job_title,
                        department=department,
                        description=description,
                        round_name=target_round.get('name', ''),
                        round_type=target_round.get('type', ''),
                        round_description=target_round.get('description', ''),
                        count=count
                    )
                    return Response({'questions': new_qs, 'round_type': regenerate_round_type}, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({'error': f'AI generation failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        # Otherwise, generate questions for all rounds in the payload
        response_data = {}
        for r in rounds:
            r_type = r.get('type')
            try:
                new_qs = QuestionGenerationService.generate_questions(
                    job_title=job_title,
                    department=department,
                    description=description,
                    round_name=r.get('name', '') or r.get('type', ''),
                    round_type=r_type,
                    round_description=r.get('description', ''),
                    count=count
                )
                response_data[r_type] = new_qs
            except Exception as e:
                return Response({'error': f'AI generation failed for round {r_type}: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        return Response(response_data, status=status.HTTP_200_OK)


class FlowRoundViewSet(viewsets.ModelViewSet):
    queryset = FlowRound.objects.all()
    serializer_class = FlowRoundSerializer

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.conf import settings
import google.generativeai as genai
import json
from .models import JobOpening
from .serializers import JobOpeningSerializer

class JobOpeningViewSet(viewsets.ModelViewSet):
    queryset = JobOpening.objects.all()
    serializer_class = JobOpeningSerializer

    @action(detail=False, methods=['post'])
    def generate_questions(self, request):
        title = request.data.get('title', '')
        department = request.data.get('department', '')
        if not title:
            return Response({"error": "Job title is required"}, status=status.HTTP_400_BAD_REQUEST)

        api_key = getattr(settings, 'GEMINI_API_KEY', '')
        if not api_key:
            return Response({"error": "Gemini API key not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            prompt = f"""
            You are an expert technical recruiter and interviewer. Generate interview questions for the following role:
            Job Title: {title}
            Department: {department}
            
            Generate exactly 2 multiple-choice questions (MCQs) and 3 descriptive questions that assess candidates for this role.
            Return the output in this strict JSON format:
            {{
              "mcqs": [
                {{
                  "question": "The question text",
                  "options": ["Option A", "Option B", "Option C", "Option D"],
                  "answer": "0" // The zero-based index of the correct option as a string
                }}
              ],
              "descriptive": [
                {{
                  "question": "The descriptive question text",
                  "expected_answer": "The ideal/expected answer or marking guide"
                }}
              ]
            }}
            Do not return any markdown code block tags or extra text, just raw JSON.
            """
            
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            
            result = json.loads(response.text)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

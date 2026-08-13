import os
import sys
import django
from pathlib import Path

# Add the backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from hirelense_backend.apps.candidates.models import Candidate, CandidateScoreDetail, CandidateTranscriptLine
from hirelense_backend.apps.candidates.services import CandidateEvaluationService

def run_test():
    print("==================================================")
    print("Testing CandidateEvaluationService...")
    print("==================================================")
    
    # 1. Fetch a candidate
    try:
        candidate = Candidate.objects.get(id=33) # pratiksha
        print(f"Testing with Candidate: {candidate.name}")
        print(f"Opening: {candidate.opening.title}")
        print(f"Flow: {candidate.opening.flow}")
        print(f"Scorecard: {candidate.opening.scorecard}")
    except Candidate.DoesNotExist:
        print("Error: Candidate with ID 33 (pratiksha) not found.")
        return
        
    # Create mock answers matching the descriptive flow
    # Descriptive flow tech category has questions:
    # Q19: "explain in depth about the javascript"
    # Q20: "tell me about what is server side scripting"
    # HR category has questions:
    # Q17: "what is your expected salary"
    # Q18: "why do you want that much salary"
    mock_answers = {
        "q-17": {"answer": "My expected salary is around 8 to 10 LPA depending on the role requirements and benefits."},
        "q-18": {"answer": "I believe that my skills in frontend development, experience with React, and problem solving match the requirements of this role and justify this salary."},
        "q-19": {"answer": "JavaScript is a prototype-based, single-threaded, dynamic language that supports object-oriented, imperative, and declarative styles. It uses an event loop for asynchronous operations."},
        "q-20": {"answer": "Server side scripting is a method of designing websites so that the process or user request is run on the server side instead of the client side (web browser)."}
    }
    
    # Mock MCQ answers
    mock_mcq_answers = {}

    # Clear existing transcript and scorecards details for a clean run
    candidate.transcript.all().delete()
    candidate.scores.all().delete()
    
    print("\n--- Test Case 1: Fallback Heuristic Grading (No API Key) ---")
    # Temporarily remove GEMINI_API_KEY from settings to force fallback
    from django.conf import settings
    original_key = getattr(settings, 'GEMINI_API_KEY', '')
    settings.GEMINI_API_KEY = ''
    
    success = CandidateEvaluationService.evaluate_interview(
        candidate=candidate,
        answers=mock_answers,
        mcq_answers=mock_mcq_answers,
        flow=candidate.opening.flow,
        scorecard=candidate.opening.scorecard
    )
    
    print(f"Evaluation return status: {success}")
    print(f"Candidate Overall Score: {candidate.score}")
    print(f"AI Summary: {candidate.ai_summary}")
    print("\nCandidate Score Details (Parameters):")
    for score in candidate.scores.all():
        print(f" - {score.parameter_name}: {score.score_value}")
        
    print("\nCandidate Transcript Lines:")
    for line in candidate.transcript.all():
        print(f" - Question: {line.question_text[:50]}... | Score: {line.score_value}/10 | Answer: {line.answer_text}")

    # Restore key
    settings.GEMINI_API_KEY = original_key
    
    print("\n--- Test Case 2: Live Gemini Flash Grading (With API Key) ---")
    if not settings.GEMINI_API_KEY:
        print("Warning: GEMINI_API_KEY is not configured in environment/settings. Skipping live test.")
    else:
        # Clear database records again
        candidate.transcript.all().delete()
        candidate.scores.all().delete()
        
        success = CandidateEvaluationService.evaluate_interview(
            candidate=candidate,
            answers=mock_answers,
            mcq_answers=mock_mcq_answers,
            flow=candidate.opening.flow,
            scorecard=candidate.opening.scorecard
        )
        
        print(f"Evaluation return status: {success}")
        print(f"Candidate Overall Score: {candidate.score}")
        print(f"AI Summary: {candidate.ai_summary}")
        print("\nCandidate Score Details (Parameters):")
        for score in candidate.scores.all():
            print(f" - {score.parameter_name}: {score.score_value}")
            
        print("\nCandidate Transcript Lines:")
        for line in candidate.transcript.all():
            print(f" - Question: {line.question_text[:50]}... | Score: {line.score_value}/10 | Answer: {line.answer_text}")

    print("\n==================================================")
    print("Test Completed Successfully!")
    print("==================================================")


if __name__ == '__main__':
    run_test()

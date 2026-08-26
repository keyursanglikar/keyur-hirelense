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

from hirelense_backend.apps.flows.services import QuestionGenerationService

def run_test():
    print("==================================================")
    print("Testing QuestionGenerationService with Gemini...")
    print("==================================================")
    
    # Check API key configuration
    from django.conf import settings
    api_key = getattr(settings, 'GEMINI_API_KEY', '')
    if not api_key:
        print("Error: GEMINI_API_KEY is not set in backend/.env!")
        return
        
    job_title = "Senior Python Developer"
    department = "Engineering"
    description = "Evaluate the candidate's Python expertise, backend design, and database knowledge."
    
    # Test case 1: Bulk generation of 5 questions
    print("\n--- Test Case 1: Bulk Generation (5 Questions for Technical Round) ---")
    try:
        qs = QuestionGenerationService.generate_questions(
            job_title=job_title,
            department=department,
            description=description,
            round_name="Technical Round",
            round_type="tech",
            round_description="Verify Python OOP, Django models, REST API, and indexing.",
            count=5
        )
        print(f"Generated {len(qs)} questions:")
        for idx, item in enumerate(qs):
            print(f"\n[{idx+1}] Question: {item.get('question')}")
            print(f"    Expected Answer: {item.get('answer')}")
            print(f"    Difficulty: {item.get('difficulty')} | timeLimit: {item.get('timeLimit')} min | marks: {item.get('marks')}")
            
    except Exception as e:
        print(f"Error in Test Case 1: {str(e)}")
        return

    # Test case 2: Regeneration of 1 question with duplicate prevention
    print("\n--- Test Case 2: Single Question Regeneration (with duplicate prevention) ---")
    existing = [q.get('question') for q in qs[:4]] # Feed first 4 questions as existing to avoid duplicate
    print("Existing questions to avoid:")
    for ex in existing:
        print(f"  - {ex}")
        
    try:
        new_qs = QuestionGenerationService.generate_questions(
            job_title=job_title,
            department=department,
            description=description,
            round_name="Technical Round",
            round_type="tech",
            round_description="Verify Python OOP, Django models, REST API, and indexing.",
            count=1,
            existing_questions=existing
        )
        print(f"Generated {len(new_qs)} new question:")
        for item in new_qs:
            print(f"\n[NEW] Question: {item.get('question')}")
            print(f"      Expected Answer: {item.get('answer')}")
            print(f"      Difficulty: {item.get('difficulty')} | timeLimit: {item.get('timeLimit')} min")
            
    except Exception as e:
        print(f"Error in Test Case 2: {str(e)}")

    print("\n==================================================")
    print("Test Completed Successfully!")
    print("==================================================")

if __name__ == '__main__':
    run_test()

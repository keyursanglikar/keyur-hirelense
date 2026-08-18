import logging
import json
from django.conf import settings
from django.contrib.auth import get_user_model
User = get_user_model()
import google.generativeai as genai

logger = logging.getLogger(__name__)

class QuestionGenerationService:
    @staticmethod
    def generate_questions(job_title, department, description, round_name, round_type, round_description, count=5, existing_questions=None):
        """
        Generates structured interview questions and expected answers for a round using Gemini 1.5 Flash.
        """
        api_key = getattr(settings, 'GEMINI_API_KEY', '')
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not configured in settings.")
            
        genai.configure(api_key=api_key)
        
        # Use gemini-1.5-flash which is standard for fast JSON generation
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        existing_str = ""
        if existing_questions and len(existing_questions) > 0:
            existing_str = "Existing questions to avoid duplicating:\n" + "\n".join([f"- {q}" for q in existing_questions]) + "\n"

        system_prompt = (
            "You are an expert AI recruiting assistant. Your task is to generate highly relevant, "
            "professional interview questions and corresponding expected answers based on the target job, "
            "department, round name, round type, and round description."
        )

        user_prompt = f"""
Generate exactly {count} unique, non-repetitive interview questions for this specific round:
Round Name: {round_name}
Round Type: {round_type}
Round Description: {round_description}

Job Details:
Job Title: {job_title}
Department: {department}
Interview Flow Description: {description}
{existing_str}
Requirements:
1. STRICT ROUND ENFORCEMENT: The question MUST perfectly match the Round Type. If this is an HR round, generate ONLY behavioral, cultural, or situational HR questions (NO coding or technical skills questions). If this is a Technical round, generate strictly technical/skill-based questions.
2. Avoid generic questions; make them specific to the job title and description.
3. For every generated question, provide an 'answer'. If it is an MCQ round, the 'answer' must strictly be 'A', 'B', 'C', or 'D' representing the correct option.
4. Each question should test a different skill, competency, or aspect of the candidate where possible.
5. Return the response in this exact JSON schema:
{{
  "questions": [
    {{
      "question": "string (the question text)",
      "answer": "string (the expected answer, or 'A', 'B', 'C', 'D' if MCQ)",
      "options": [
        {{ "label": "A", "text": "string (the option text)" }},
        {{ "label": "B", "text": "string (the option text)" }},
        {{ "label": "C", "text": "string (the option text)" }},
        {{ "label": "D", "text": "string (the option text)" }}
      ],
      "difficulty": "Easy" | "Medium" | "Hard",
      "timeLimit": integer (in minutes, e.g. 2 to 5),
      "marks": integer (standard is 10)
    }}
  ]
}}
Note: You MUST include the 'options' array if generating MCQs. Ensure valid JSON format and escape any quotes properly!
"""
        
        try:
            logger.info(f"Calling Gemini to generate {count} questions for round '{round_name}' ({round_type})...")
            response = model.generate_content(
                [system_prompt, user_prompt],
                generation_config={"response_mime_type": "application/json"}
            )
            
            text = response.text.strip()
            start = text.find('{')
            end = text.rfind('}')
            if start != -1 and end != -1:
                text = text[start:end+1]
                
            result = json.loads(text)
            return result.get("questions", [])
            
        except Exception as e:
            logger.error(f"Failed to generate questions: {str(e)}", exc_info=True)
            raise e

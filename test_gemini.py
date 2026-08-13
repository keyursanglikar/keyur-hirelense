import google.generativeai as genai
import os
import json
from dotenv import load_dotenv
load_dotenv(override=True)
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
model = genai.GenerativeModel('gemini-3.5-flash')
prompt = '''
Return the response in this exact JSON schema:
{
  "questions": [
    {
      "question": "string",
      "answer": "A",
      "options": [
        { "label": "A", "text": "string" },
        { "label": "B", "text": "string" },
        { "label": "C", "text": "string" },
        { "label": "D", "text": "string" }
      ],
      "difficulty": "Medium",
      "timeLimit": 2,
      "marks": 10
    }
  ]
}
'''
response = model.generate_content(prompt, generation_config={'response_mime_type': 'application/json'})
print(response.text)

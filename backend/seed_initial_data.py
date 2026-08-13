import os
import sys
import django
import json

# Setup django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_platform.settings')
django.setup()

from hirelense_backend.apps.tenants.models import Tenant
from hirelense_backend.apps.flows.models import InterviewFlow, FlowRound
from hirelense_backend.apps.pools.models import QuestionPool, PoolQuestion
from hirelense_backend.apps.scorecards.models import Scorecard, ScorecardParameter

tenant, _ = Tenant.objects.get_or_create(id=1, defaults={'name': 'Hirelens Default Firm'})

INITIAL_FLOWS = [
  {
    "name": "Audit & Tax Screening",
    "version": "v2",
    "is_live": True,
    "ai_model": "sonnet",
    "rounds": [
      { "type": "form", "dur": 5, "order": 0, "name": "Form Screening", "description": "Verify qualifications and basic screening info", "questions": [
        { "question": "Tell us about your highest qualification and attempts.", "answer": "CA, M.Com or B.Com. Detail attempts if any.", "timeLimit": 2, "difficulty": "Easy" },
        { "question": "What is your current notice period?", "answer": "Immediate, 15 days, 30 days.", "timeLimit": 1, "difficulty": "Easy" }
      ]},
      { "type": "hr", "dur": 10, "order": 1, "name": "HR Round", "description": "Verify soft skills and cultural fit parameters", "questions": [
        { "question": "Tell me about yourself and what draws you to audit and taxation.", "answer": "Clear career arc, genuine interest in compliance.", "timeLimit": 4, "difficulty": "Easy" },
        { "question": "Describe a deadline you nearly missed. What changed afterwards?", "answer": "Honest Near-miss details, concrete action plan.", "timeLimit": 4, "difficulty": "Medium" }
      ]},
      { "type": "tech", "dur": 10, "order": 2, "name": "Technical Screening", "description": "Assess accounting and audit principles knowledge", "questions": [
        { "question": "Explain the difference between a tax audit u/s 44AB and a statutory audit under the Companies Act.", "answer": "Thresholds, form types, reporting authorities.", "timeLimit": 5, "difficulty": "Hard" },
        { "question": "A client repairs a machine for 3L. Capitalise or expense — how do you decide?", "answer": "Enhancement vs restoration test, AS 10 rules.", "timeLimit": 5, "difficulty": "Medium" }
      ]},
      { "type": "case", "dur": 10, "order": 3, "name": "Case Analysis", "description": "Reconcile real-world ASMT notices", "questions": [
        { "question": "ASMT-10 notice: GSTR-3B ITC exceeds 2B by 4.2L. Walk through your cause analysis and reply.", "answer": "Timing diffs, vendor default, reconciliation steps.", "timeLimit": 7, "difficulty": "Hard" }
      ]},
      { "type": "mcq", "dur": 5, "order": 4, "name": "Objective Test", "description": "MCQ screening on GST regulations", "questions": [
        { "question": "ITC on motor vehicles for transport of persons (seating <= 13) is blocked, except when used for—", "answer": "Further supply of such vehicles", "timeLimit": 1, "difficulty": "Easy" },
        { "question": "Under AS 2 / Ind AS 2, inventories are valued at—", "answer": "Lower of cost and NRV", "timeLimit": 1, "difficulty": "Easy" }
      ]}
    ]
  },
  {
    "name": "CA Articleship Screening",
    "version": "v1",
    "is_live": True,
    "ai_model": "haiku",
    "rounds": [
      { "type": "form", "dur": 5, "order": 0, "name": "Academics Form", "description": "Verify inter attempts", "questions": [
        { "question": "CA Inter groups cleared and attempts", "answer": "Both groups, first attempt", "timeLimit": 2, "difficulty": "Easy" }
      ]},
      { "type": "hr", "dur": 10, "order": 1, "name": "HR Fit", "description": "Assess learning attitude", "questions": [
        { "question": "Why do you want to pursue articleship at our firm?", "answer": "Eagerness to learn, knowledge of our client list.", "timeLimit": 4, "difficulty": "Easy" }
      ]}
    ]
  },
  {
    "name": "Sales Executive Screening",
    "version": "v1",
    "is_live": True,
    "ai_model": "gptm",
    "rounds": [
      { "type": "hr", "dur": 5, "order": 0, "name": "Elevator Pitch", "description": "Test presentation skills", "questions": [
        { "question": "Introduce yourself and pitch our product in 2 minutes.", "answer": "Clear communication, confident delivery.", "timeLimit": 3, "difficulty": "Medium" }
      ]}
    ]
  }
]

INITIAL_SCORECARDS = [
  {
    "name": "Audit & Tax Scorecard",
    "version": "v1",
    "is_live": True,
    "auto_reject_threshold": 50,
    "rating_scale": "1-10",
    "parameters": [
      { "name": "Domain knowledge", "weight": 30, "description": json.dumps({"maxMarks": 10, "mandatory": True}) },
      { "name": "Communication", "weight": 20, "description": json.dumps({"maxMarks": 10, "mandatory": True}) },
      { "name": "Problem Solving", "weight": 20, "description": json.dumps({"maxMarks": 10, "mandatory": True}) },
      { "name": "Ownership & attitude", "weight": 15, "description": json.dumps({"maxMarks": 10, "mandatory": False}) },
      { "name": "Culture Fit", "weight": 15, "description": json.dumps({"maxMarks": 10, "mandatory": False}) }
    ]
  },
  {
    "name": "Articleship Scorecard",
    "version": "v1",
    "is_live": True,
    "auto_reject_threshold": 50,
    "rating_scale": "1-10",
    "parameters": [
      { "name": "Fundamentals", "weight": 35, "description": json.dumps({"maxMarks": 10, "mandatory": True}) },
      { "name": "Learning attitude", "weight": 25, "description": json.dumps({"maxMarks": 10, "mandatory": True}) },
      { "name": "Communication", "weight": 20, "description": json.dumps({"maxMarks": 10, "mandatory": False}) },
      { "name": "Culture Fit", "weight": 20, "description": json.dumps({"maxMarks": 10, "mandatory": False}) }
    ]
  }
]

# Seed Flows
for f_data in INITIAL_FLOWS:
    if not InterviewFlow.objects.filter(name=f_data['name']).exists():
        flow = InterviewFlow.objects.create(
            tenant=tenant,
            name=f_data['name'],
            version=f_data['version'],
            is_live=f_data['is_live'],
            ai_model=f_data['ai_model']
        )
        for r_idx, r_data in enumerate(f_data['rounds']):
            FlowRound.objects.create(
                flow=flow,
                type=r_data['type'],
                dur=r_data['dur'],
                order=r_data['order']
            )
            
            questions = r_data.get('questions', [])
            if questions and r_data['type'] in dict(QuestionPool.POOL_CATEGORIES):
                pool, _ = QuestionPool.objects.get_or_create(
                    flow=flow,
                    category=r_data['type'],
                    defaults={'ask_count': len(questions)}
                )
                
                for q_data in questions:
                    guide_payload = {
                        'answer': q_data['answer'],
                        'timeLimit': q_data['timeLimit'],
                        'type': r_data['type'],
                        'difficulty': q_data['difficulty'],
                        'marks': 10,
                        'mcqs': [],
                        'hints': ''
                    }
                    PoolQuestion.objects.create(
                        pool=pool,
                        question_text=q_data['question'],
                        marking_guide=json.dumps(guide_payload),
                        feeds_parameter='Technical Skills' if r_data['type'] == 'tech' else 'Communication',
                        is_approved=True
                    )
        print(f"Created flow: {flow.name}")

# Seed Scorecards
for s_data in INITIAL_SCORECARDS:
    if not Scorecard.objects.filter(name=s_data['name']).exists():
        sc = Scorecard.objects.create(
            tenant=tenant,
            name=s_data['name'],
            version=s_data['version'],
            is_live=s_data['is_live'],
            auto_reject_threshold=s_data['auto_reject_threshold'],
            rating_scale=s_data['rating_scale']
        )
        for p_data in s_data['parameters']:
            ScorecardParameter.objects.create(
                scorecard=sc,
                name=p_data['name'],
                weight=p_data['weight'],
                description=p_data['description']
            )
        print(f"Created scorecard: {sc.name}")

print("Seeding complete.")

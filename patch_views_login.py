import re

file_path = r"f:\FREELANCE\NZ-Solutions\keyur-hirelense-final\ca-saas-platform\backend\hirelense_backend\apps\candidates\views.py"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace opening.flow with safe check
old_code = '''            opening = candidate.opening
            flow = opening.flow
            
            rounds_list = []
            if flow:'''

new_code = '''            opening = candidate.opening
            flow = opening.flow if opening else None
            
            rounds_list = []
            if flow:'''

content = content.replace(old_code, new_code)

# Replace scorecard safe check
old_scorecard = '''                    session = InterviewSession.objects.create(
                        candidate=candidate,
                        invitation=candidate.invitations.last(),
                        job_opening=opening,
                        interview_flow=flow,
                        scorecard=opening.scorecard,'''

new_scorecard = '''                    session = InterviewSession.objects.create(
                        candidate=candidate,
                        invitation=candidate.invitations.last(),
                        job_opening=opening,
                        interview_flow=flow,
                        scorecard=opening.scorecard if opening else None,'''

content = content.replace(old_scorecard, new_scorecard)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Views patched for safe opening")

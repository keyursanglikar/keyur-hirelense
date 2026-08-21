import re

file_path = r"f:\FREELANCE\NZ-Solutions\keyur-hirelense-final\ca-saas-platform\modules\Hirelens\hirelense\frontend\src\apps\candidate-flow\src\CandidateFlow.jsx"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Optional chaining replacements
content = content.replace('data.candidate.candidate_id', 'data.candidate?.candidate_id')
content = content.replace('data.candidate.email', 'data.candidate?.email')
content = content.replace('data.candidate.phone_no', 'data.candidate?.phone_no')
content = content.replace('data.candidate.highest_qualification', 'data.candidate?.highest_qualification')
content = content.replace('data.candidate.relevant_experience', 'data.candidate?.relevant_experience')
content = content.replace('data.candidate.notice_period', 'data.candidate?.notice_period')
content = content.replace('data.candidate.expected_ctc', 'data.candidate?.expected_ctc')
content = content.replace('data.candidate.linkedin_profile', 'data.candidate?.linkedin_profile')

content = content.replace('data.opening.experience', 'data.opening?.experience')
content = content.replace('data.opening.salary', 'data.opening?.salary')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Safeguards patched!")

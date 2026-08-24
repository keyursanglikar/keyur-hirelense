import re

file_path = r"f:\FREELANCE\NZ-Solutions\keyur-hirelense-final\ca-saas-platform\modules\Hirelens\hirelense\frontend\src\apps\candidate-flow\src\CandidateFlow.jsx"
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "Access Denied" in line:
        start = max(0, i - 10)
        end = min(len(lines), i + 10)
        print("".join(lines[start:end]))

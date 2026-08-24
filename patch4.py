import re

file_path = r'f:\FREELANCE\NZ-Solutions\keyur-hirelense-final\ca-saas-platform\modules\Hirelens\hirelenserontend\srcpps\employer-portal\src\EmployerPortal.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('{ tn', '{tn')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

import re

file_path = r"f:\FREELANCE\NZ-Solutions\keyur-hirelense-final\ca-saas-platform\backend\hirelense_backend\apps\candidates\views.py"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_meta = '''            opening_meta = {}
            if opening.meta_info:
                try:
                    opening_meta = json.loads(opening.meta_info)'''

new_meta = '''            opening_meta = {}
            if opening and opening.meta_info:
                try:
                    opening_meta = json.loads(opening.meta_info)'''

content = content.replace(old_meta, new_meta)

old_dict = '''                'opening': {
                    'id': opening.id,
                    'title': opening.title,
                    'status': opening.status,
                    'experience': opening_meta.get('experience', ''),
                    'salary': opening_meta.get('salary', '')
                },'''

new_dict = '''                'opening': {
                    'id': opening.id if opening else None,
                    'title': opening.title if opening else None,
                    'status': opening.status if opening else None,
                    'experience': opening_meta.get('experience', ''),
                    'salary': opening_meta.get('salary', '')
                } if opening else None,'''

content = content.replace(old_dict, new_dict)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Views patched 2")

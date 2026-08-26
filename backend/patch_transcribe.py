content = '''
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def transcribe(self, request):
        audio_file = request.FILES.get('audio')
        if not audio_file:
            return Response({'error': 'No audio file provided'}, status=status.HTTP_400_BAD_REQUEST)

        import tempfile
        import os
        from .transcriber import transcribe_audio
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
            for chunk in audio_file.chunks():
                temp_audio.write(chunk)
            temp_file_path = temp_audio.name
            
        try:
            transcript = transcribe_audio(temp_file_path)
        finally:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
                
        return Response({'transcript': transcript})
'''

with open('hirelense_backend/apps/candidates/views.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'class CandidateViewSet' in line:
        class_idx = i
        break

lines.insert(class_idx + 2, content)

with open('hirelense_backend/apps/candidates/views.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

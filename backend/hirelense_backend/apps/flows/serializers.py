from rest_framework import serializers
from .models import InterviewFlow, FlowRound

class FlowRoundSerializer(serializers.ModelSerializer):
    questions = serializers.SerializerMethodField()
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = FlowRound
        fields = ['id', 'flow', 'type', 'type_display', 'dur', 'order', 'questions']
        extra_kwargs = {
            'flow': {'required': False, 'allow_null': True}
        }

    def get_questions(self, obj):
        from hirelense_backend.apps.pools.models import QuestionPool
        import json
        pool = QuestionPool.objects.filter(flow=obj.flow, category=obj.type).first()
        if pool:
            questions_list = []
            for q in pool.questions.all():
                q_type = obj.type
                answer_text = q.marking_guide
                time_limit = 2
                difficulty = 'Medium'
                marks = 10
                mcqs = []
                hints = ''
                if q.marking_guide:
                    try:
                        parsed = json.loads(q.marking_guide)
                        if isinstance(parsed, dict):
                            answer_text = parsed.get('answer', q.marking_guide)
                            time_limit = int(parsed.get('timeLimit', 2))
                            q_type = parsed.get('type', obj.type)
                            difficulty = parsed.get('difficulty', 'Medium')
                            marks = int(parsed.get('marks', 10))
                            mcqs = parsed.get('mcqs', [])
                            hints = parsed.get('hints', '')
                    except (ValueError, TypeError):
                        pass
                questions_list.append({
                    'id': q.id,
                    'question': q.question_text,
                    'type': q_type,
                    'answer': answer_text,
                    'timeLimit': time_limit,
                    'difficulty': difficulty,
                    'marks': marks,
                    'mcqs': mcqs,
                    'hints': hints,
                    'feeds_parameter': q.feeds_parameter
                })
            return questions_list
        return []

class InterviewFlowSerializer(serializers.ModelSerializer):
    rounds = FlowRoundSerializer(many=True, required=False)

    class Meta:
        model = InterviewFlow
        fields = ['id', 'tenant', 'name', 'version', 'is_live', 'ai_model', 'rounds', 'created_at', 'updated_at']
        extra_kwargs = {
            'tenant': {'required': False, 'allow_null': True}
        }

    def create(self, validated_data):
        # Read from raw self.initial_data to prevent DRF from stripping out read-only SerializerMethodFields (questions)
        initial_rounds = self.initial_data.get('rounds', []) if hasattr(self, 'initial_data') and self.initial_data else []
        
        # Pop validated rounds just in case to clean Meta
        validated_data.pop('rounds', [])
        
        if 'tenant' not in validated_data or validated_data['tenant'] is None:
            from hirelense_backend.apps.tenants.models import Tenant
            validated_data['tenant'] = Tenant.objects.first() or Tenant.objects.create(id=1, name="Default Tenant")

        flow = InterviewFlow.objects.create(**validated_data)
        
        # Save nested rounds and their questions
        from hirelense_backend.apps.pools.models import QuestionPool, PoolQuestion
        for idx, round_item in enumerate(initial_rounds):
            r_type = round_item.get('type')
            dur = round_item.get('dur', 5)
            FlowRound.objects.create(
                flow=flow,
                type=r_type,
                dur=int(dur) if dur is not None else 5,
                order=round_item.get('order', idx)
            )

            # Store questions in QuestionPool/PoolQuestion
            questions_data = round_item.get('questions', [])
            if questions_data and r_type in dict(QuestionPool.POOL_CATEGORIES):
                pool, _ = QuestionPool.objects.get_or_create(
                    flow=flow,
                    category=r_type,
                    defaults={'ask_count': len(questions_data)}
                )
                pool.ask_count = len(questions_data)
                pool.save()
                
                pool.questions.all().delete()
                import json
                for q_item in questions_data:
                    q_text = q_item.get('question') or q_item.get('text') or q_item.get('question_text')
                    if q_text:
                        ans_val = q_item.get('answer') or q_item.get('marking_guide') or ''
                        limit_val = q_item.get('timeLimit') or q_item.get('time_limit') or 2
                        guide_payload = {
                            'answer': ans_val,
                            'timeLimit': int(limit_val),
                            'type': q_item.get('type', r_type),
                            'difficulty': q_item.get('difficulty', 'Medium'),
                            'marks': int(q_item.get('marks', 10)),
                            'mcqs': q_item.get('mcqs', []),
                            'hints': q_item.get('hints', '')
                        }
                        PoolQuestion.objects.create(
                            pool=pool,
                            question_text=q_text,
                            marking_guide=json.dumps(guide_payload),
                            feeds_parameter='Technical Skills' if r_type == 'tech' else 'Communication',
                            is_approved=True
                        )
        return flow

    def update(self, instance, validated_data):
        # Read from raw self.initial_data to prevent DRF from stripping out read-only SerializerMethodFields (questions)
        initial_rounds = self.initial_data.get('rounds', None) if hasattr(self, 'initial_data') and self.initial_data else None
        
        # Pop validated rounds just in case to clean Meta
        validated_data.pop('rounds', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update nested rounds and questions
        if initial_rounds is not None:
            instance.rounds.all().delete()
            from hirelense_backend.apps.pools.models import QuestionPool, PoolQuestion
            instance.pools.all().delete() # Avoid clashes by recreating
            
            for idx, round_item in enumerate(initial_rounds):
                r_type = round_item.get('type')
                dur = round_item.get('dur', 5)
                FlowRound.objects.create(
                    flow=instance,
                    type=r_type,
                    dur=int(dur) if dur is not None else 5,
                    order=round_item.get('order', idx)
                )

                questions_data = round_item.get('questions', [])
                if questions_data and r_type in dict(QuestionPool.POOL_CATEGORIES):
                    pool, _ = QuestionPool.objects.get_or_create(
                        flow=instance,
                        category=r_type,
                        defaults={'ask_count': len(questions_data)}
                    )
                    pool.ask_count = len(questions_data)
                    pool.save()
                    
                    pool.questions.all().delete()
                    import json
                    for q_item in questions_data:
                        q_text = q_item.get('question') or q_item.get('text') or q_item.get('question_text')
                        if q_text:
                            ans_val = q_item.get('answer') or q_item.get('marking_guide') or ''
                            limit_val = q_item.get('timeLimit') or q_item.get('time_limit') or 2
                            guide_payload = {
                                'answer': ans_val,
                                'timeLimit': int(limit_val),
                                'type': q_item.get('type', r_type),
                                'difficulty': q_item.get('difficulty', 'Medium'),
                                'marks': int(q_item.get('marks', 10)),
                                'mcqs': q_item.get('mcqs', []),
                                'hints': q_item.get('hints', '')
                            }
                            PoolQuestion.objects.create(
                                pool=pool,
                                question_text=q_text,
                                marking_guide=json.dumps(guide_payload),
                                feeds_parameter='Technical Skills' if r_type == 'tech' else 'Communication',
                                is_approved=True
                            )
        return instance

from rest_framework import serializers
from .models import Scorecard, ScorecardParameter

class ScorecardParameterSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScorecardParameter
        fields = '__all__'

class ScorecardSerializer(serializers.ModelSerializer):
    parameters = ScorecardParameterSerializer(many=True, read_only=True)
    criteria = serializers.JSONField(write_only=True, required=False)

    class Meta:
        model = Scorecard
        fields = ['id', 'tenant', 'name', 'version', 'is_live', 'auto_reject_threshold', 'rating_scale', 'parameters', 'criteria', 'created_at', 'updated_at']
        extra_kwargs = {
            'tenant': {'required': False, 'allow_null': True}
        }

    def create(self, validated_data):
        criteria_data = validated_data.pop('criteria', [])
        # Default to first tenant if not explicitly provided
        if 'tenant' not in validated_data or validated_data['tenant'] is None:
            from hirelense_backend.apps.tenants.models import Tenant
            validated_data['tenant'] = Tenant.objects.first() or Tenant.objects.create(id=1, name="Default Tenant")

        scorecard = Scorecard.objects.create(**validated_data)
        
        # Save nested criteria as ScorecardParameter objects
        for crit in criteria_data:
            name = crit.get('name')
            weight = crit.get('weight', 0)
            max_marks = crit.get('maxMarks', 10)
            mandatory = crit.get('mandatory', False)
            desc_val = crit.get('description', '')
            
            import json
            desc_json = json.dumps({
                'maxMarks': max_marks,
                'mandatory': mandatory,
                'details': desc_val
            })
            
            ScorecardParameter.objects.create(
                scorecard=scorecard,
                name=name,
                weight=weight,
                description=desc_json
            )
        return scorecard

    def update(self, instance, validated_data):
        criteria_data = validated_data.pop('criteria', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update nested criteria
        if criteria_data is not None:
            instance.parameters.all().delete()
            for crit in criteria_data:
                name = crit.get('name')
                weight = crit.get('weight', 0)
                max_marks = crit.get('maxMarks', 10)
                mandatory = crit.get('mandatory', False)
                desc_val = crit.get('description', '')
                
                import json
                desc_json = json.dumps({
                    'maxMarks': max_marks,
                    'mandatory': mandatory,
                    'details': desc_val
                })
                
                ScorecardParameter.objects.create(
                    scorecard=instance,
                    name=name,
                    weight=weight,
                    description=desc_json
                )
        return instance

import os
import sys
import django
from pathlib import Path

# Add the backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()


from hirelense_backend.apps.scorecards.models import Scorecard, ScorecardParameter

def enrich_scorecards():
    print("Enriching scorecards in database...")
    scorecards = Scorecard.objects.all()
    
    for scorecard in scorecards:
        params = list(scorecard.parameters.all())
        param_names = [p.name.strip().lower() for p in params]
        
        # Skip if scorecard already has Problem Solving
        if 'problem solving' in param_names:
            print(f"Skipping '{scorecard.name}': Already has 'Problem Solving'")
            continue
            
        print(f"Checking scorecard '{scorecard.name}' with {len(params)} parameters...")
        
        # If the scorecard has exactly 2 parameters, let's add Problem Solving and adjust weights
        if len(params) == 2:
            p1, p2 = params[0], params[1]
            print(f"  Enriching from 2 parameters: {p1.name} ({p1.weight}%), {p2.name} ({p2.weight}%)")
            
            # Standard redistribution:
            # Main parameter (usually Technical Skills) -> 50%
            # Second parameter (usually Communication) -> 25%
            # Problem Solving -> 25%
            # Or if weights are different, we can scale them
            p1.weight = 50
            p1.save()
            
            p2.weight = 25
            p2.save()
            
            ScorecardParameter.objects.create(
                scorecard=scorecard,
                name='Problem Solving',
                weight=25,
                description='Ability to analyze situations and solve problems'
            )
            print(f"  Enriched '{scorecard.name}': Added 'Problem Solving' (25%). New weights: 50% / 25% / 25%")
            
        elif len(params) > 2:
            # If the scorecard has more than 2 parameters, but lacks 'Problem Solving',
            # we can add it with a 15% weight and scale down the others proportionally
            print(f"  Scorecard '{scorecard.name}' has {len(params)} parameters. Adding 'Problem Solving' (15%) and scaling others...")
            
            total_current_weight = sum(p.weight for p in params)
            if total_current_weight == 0:
                total_current_weight = 100
                
            # Create Problem Solving parameter
            ScorecardParameter.objects.create(
                scorecard=scorecard,
                name='Problem Solving',
                weight=15,
                description='Ability to analyze situations and solve problems'
            )
            
            # Scale down the other parameters so the total is exactly 100%
            # Remaining target weight = 85%
            remaining_weight = 85
            acc_weight = 0
            for i, p in enumerate(params):
                if i == len(params) - 1:
                    p.weight = remaining_weight - acc_weight
                else:
                    p.weight = int(round((p.weight / total_current_weight) * remaining_weight))
                    acc_weight += p.weight
                p.save()
            print(f"  Enriched '{scorecard.name}': Added 'Problem Solving' (15%) and scaled others.")
            
        else:
            # If scorecard has 0 or 1 parameters, let's create a standard 3-parameter setup
            print(f"  Scorecard '{scorecard.name}' has {len(params)} parameters. Resetting to standard 3-parameter setup...")
            scorecard.parameters.all().delete()
            
            ScorecardParameter.objects.create(
                scorecard=scorecard,
                name='Technical Skills',
                weight=50,
                description='Role-specific technical capabilities'
            )
            ScorecardParameter.objects.create(
                scorecard=scorecard,
                name='Communication',
                weight=25,
                description='Articulate and clear spoken communication'
            )
            ScorecardParameter.objects.create(
                scorecard=scorecard,
                name='Problem Solving',
                weight=25,
                description='Ability to analyze situations and solve problems'
            )
            print(f"  Reset '{scorecard.name}': Technical Skills (50%), Communication (25%), Problem Solving (25%)")

    print("All scorecards updated successfully!")

if __name__ == '__main__':
    enrich_scorecards()

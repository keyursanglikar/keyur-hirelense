# Generated manually

from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('candidates', '0004_candidate_meta_info_candidate_video_link'),
    ]

    operations = [
        migrations.AddField(
            model_name='candidatetranscriptline',
            name='expected_answer',
            field=models.TextField(blank=True, null=True),
        ),
    ]

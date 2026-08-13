#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
import warnings
from pathlib import Path


def main():
    """Run administrative tasks."""
    # Suppress deprecation warnings in production
    if not os.environ.get('DEBUG', 'False').lower() == 'true':
        warnings.filterwarnings('ignore', category=DeprecationWarning)
        warnings.filterwarnings('ignore', category=UserWarning)
    
    # Set the default settings module
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_platform.settings')
    
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    
    # Add custom management commands path
    sys.path.append(str(Path(__file__).parent / 'core' / 'management'))
    
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
# Project Style Guide & Constraints

## Configuration & Dependency Rules
- **Environment Variables**: Whenever a new environment variable or secret is introduced or changed in the project settings, it must be added to the base `.env` template file (`backend/.env`) with clear comments and fallback defaults.
- **Python Dependencies**: Whenever a new library is imported or installed, keep the `backend/requirements.txt` file up to date immediately by adding the package and its corresponding version bounds.
- **Celery Import Protection**: Keep path-normalisation helpers in `tasks.py` to prevent import collisions of the local `celery/` directory with the package library on Windows platforms.

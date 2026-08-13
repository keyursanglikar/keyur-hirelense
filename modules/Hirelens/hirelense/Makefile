# Makefile for common project actions
.PHONY: setup start test clean

setup:
	@echo "Setting up workspace..."
	python scripts/setup/init_project.py

start:
	@echo "Starting development servers..."
	python scripts/dev/start_dev.py

test:
	@echo "Running tests..."
	python scripts/dev/run_tests.py

clean:
	@echo "Cleaning up temp files..."
	find . -type d -name "__pycache__" -exec rm -r {} +

#!/bin/bash
# Script to run the FastAPI backend server

cd "$(dirname "$0")"

# Try to use uv if available, otherwise try virtual environment
if command -v uv &> /dev/null; then
    # Use uv to run uvicorn
    echo "Starting backend with uv..."
    uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
elif [ -f "../.venv/bin/python" ]; then
    # Use virtual environment if it exists
    echo "Starting backend with virtual environment..."
    ../.venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
elif [ -f ".venv/bin/python" ]; then
    # Try local venv
    echo "Starting backend with local virtual environment..."
    .venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
else
    echo "Error: Neither uv nor virtual environment found."
    echo "Please install dependencies first:"
    echo "  cd backend && uv pip install -r requirements.txt"
    echo "Or create a virtual environment:"
    echo "  python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi


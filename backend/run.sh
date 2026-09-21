#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$SCRIPT_DIR"
export PYTHONPATH="$SCRIPT_DIR"

if [ -f "$PROJECT_ROOT/venv/bin/uvicorn" ]; then
    UVICORN_BIN="$PROJECT_ROOT/venv/bin/uvicorn"
elif command -v uvicorn >/dev/null 2>&1; then
    UVICORN_BIN="uvicorn"
else
    echo "Error: uvicorn not found. Please activate your virtual environment or install requirements."
    exit 1
fi

exec "$UVICORN_BIN" app.main:app --host 0.0.0.0 --port 8888 --workers 1


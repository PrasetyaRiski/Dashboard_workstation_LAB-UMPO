#!/bin/bash
cd /home/public/web/panel-lab/backend
export PYTHONPATH=/home/public/web/panel-lab/backend
exec /home/public/web/panel-lab/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8888 --workers 1

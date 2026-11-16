FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py .
ENV PORT=8080
# One worker, several threads: requests are I/O-bound on Earth Engine.
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 120 main:app

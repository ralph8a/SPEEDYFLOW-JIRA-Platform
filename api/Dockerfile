FROM python:3.11-slim

WORKDIR /app

# Install minimal build deps
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && pip install --no-cache-dir gunicorn

# Copy application
COPY . .

# Expose the port the Flask app listens on
EXPOSE 5005

ENV PYTHONUNBUFFERED=1

# Use gunicorn to serve the Flask app on 0.0.0.0:5005
CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:5005", "server:app"]

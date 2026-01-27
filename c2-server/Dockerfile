FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY *.py .

# Create directories
RUN mkdir -p certs uploads

# Expose ports
EXPOSE 8443

# Set environment variables
ENV FLASK_APP=app.py
ENV PYTHONUNBUFFERED=1

# Run with gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8443", "--certfile=certs/server.crt", "--keyfile=certs/server.key", "--workers=4", "app:app"]

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for psycopg2
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Environment variables for local dev
ENV DATABASE_URL=postgresql://user:password@db:5432/livrocaixa
ENV REGION=us-east-1
ENV USER_POOL_ID=local_pool
ENV USER_POOL_CLIENT_ID=local_client

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Installa dipendenze sistema
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Non esponiamo la porta 5000 all'esterno, ci penserà Nginx internamente
EXPOSE 5000

# Avvia con Gunicorn (4 worker per gestire più richieste)
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
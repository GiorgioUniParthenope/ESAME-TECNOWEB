# Usa un'immagine Python leggera ufficiale
FROM python:3.11-slim

# Imposta la cartella di lavoro nel container
WORKDIR /app

# Variabili d'ambiente per evitare file .pyc e output bufferizzato
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Installa le dipendenze di sistema (opzionale, ma utile per pg_config se servisse)
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copia il file dei requisiti e installa le librerie
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia tutto il resto del codice nel container
COPY . .

# Espone la porta 5000 (quella di Flask)
EXPOSE 5000

# Comando per avviare l'app
CMD ["python", "app.py"]
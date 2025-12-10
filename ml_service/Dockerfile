FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements
COPY requirements.txt .

# Instalar dependencias Python
RUN pip install --no-cache-dir -r requirements.txt

# Descargar modelo spaCy
RUN python -m spacy download es_core_news_md

# Copiar código
COPY . .

# Crear directorio para modelos si no existe
RUN mkdir -p /app/models

# Exponer puerto
EXPOSE 5001

# Variables de entorno
ENV PYTHONUNBUFFERED=1
ENV MODELS_DIR=/app/models

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:5001/health')"

# Comando de inicio
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5001"]

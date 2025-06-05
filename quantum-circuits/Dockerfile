FROM python:3.11

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

# Install Julia for Python-Julia bridge
RUN apt-get update && apt-get install -y julia

COPY . .

CMD ["python", "quantum_api.py"]

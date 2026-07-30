FROM python:3.11-slim
WORKDIR /app
COPY ml-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY ml-service/ .
CMD ["python", "app.py"]

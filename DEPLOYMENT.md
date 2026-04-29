# Deployment Guide - Legal Document Analysis System

Complete guide for deploying the legal document analysis system to production.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Deployment](#local-deployment)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Cloud Platforms](#cloud-platforms)
6. [Performance Tuning](#performance-tuning)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Security Best Practices](#security-best-practices)

---

## Prerequisites

- Python 3.9+
- Docker & Docker Compose (for containerized deployment)
- Kubernetes cluster (for K8s deployment)
- API keys: Anthropic for Claude or OpenAI for GPT-4
- Linux server with 4+ cores, 8GB+ RAM recommended

---

## Local Deployment

### 1. Development Environment

```bash
# Clone/navigate to project
cd /home/harish/projct_chronicles

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm

# Install Tesseract (Ubuntu/Debian)
sudo apt-get install tesseract-ocr

# Configure environment
cp .env.example .env
# Edit .env with your API keys and settings
```

### 2. Run Tests

```bash
# Install test dependencies
pip install pytest pytest-cov

# Run all tests
pytest tests.py -v

# With coverage report
pytest tests.py --cov=. --cov-report=html
```

### 3. Development Server

```bash
# Run CLI demo
python main.py

# Start API server
python -m uvicorn api:app --reload --port 8000

# Access documentation
# http://localhost:8000/docs
```

---

## Docker Deployment

### 1. Single Container

**Dockerfile**
```dockerfile
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download spaCy model
RUN python -m spacy download en_core_web_sm

# Copy application
COPY . .

# Create output directories
RUN mkdir -p /app/output /app/logs

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Build and Run**
```bash
# Build image
docker build -t legal-analyzer:v1.0.0 .

# Run container
docker run -d \
  --name legal-analyzer \
  -p 8000:8000 \
  -e LLM_PROVIDER=claude \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -v $(pwd)/output:/app/output \
  -v $(pwd)/logs:/app/logs \
  legal-analyzer:v1.0.0

# View logs
docker logs -f legal-analyzer

# Stop container
docker stop legal-analyzer
```

### 2. Docker Compose (Multi-container)

**docker-compose.yml**
```yaml
version: '3.8'

services:
  # Main API service
  api:
    build: .
    container_name: legal-analyzer-api
    ports:
      - "8000:8000"
    environment:
      - LLM_PROVIDER=claude
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - LOG_LEVEL=INFO
      - DATABASE_URL=postgresql://user:pass@postgres:5432/legal_db
    volumes:
      - ./output:/app/output
      - ./logs:/app/logs
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  # PostgreSQL for results storage
  postgres:
    image: postgres:15-alpine
    container_name: legal-analyzer-db
    environment:
      - POSTGRES_USER=legal_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=legal_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  # Redis for caching
  redis:
    image: redis:7-alpine
    container_name: legal-analyzer-cache
    restart: unless-stopped

  # Nginx reverse proxy
  nginx:
    image: nginx:alpine
    container_name: legal-analyzer-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
    restart: unless-stopped

volumes:
  postgres_data:
```

**Run with Docker Compose**
```bash
# Start all services
docker-compose up -d

# View status
docker-compose ps

# View logs
docker-compose logs -f api

# Stop services
docker-compose down

# Prune volumes
docker-compose down -v
```

---

## Kubernetes Deployment

### 1. Create Namespace

```bash
kubectl create namespace legal-analyzer
```

### 2. ConfigMap and Secrets

```yaml
# config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: legal-analyzer-config
  namespace: legal-analyzer
data:
  LOG_LEVEL: "INFO"
  LLM_PROVIDER: "claude"
  RAG_TOP_K: "3"

---
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: legal-analyzer-secrets
  namespace: legal-analyzer
type: Opaque
stringData:
  ANTHROPIC_API_KEY: "sk-ant-..."
  DB_PASSWORD: "your-secure-password"
```

```bash
kubectl apply -f config.yaml
kubectl apply -f secrets.yaml
```

### 3. Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legal-analyzer
  namespace: legal-analyzer
spec:
  replicas: 3
  selector:
    matchLabels:
      app: legal-analyzer
  template:
    metadata:
      labels:
        app: legal-analyzer
    spec:
      containers:
      - name: api
        image: legal-analyzer:v1.0.0
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 8000
        env:
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: legal-analyzer-config
              key: LOG_LEVEL
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: legal-analyzer-secrets
              key: ANTHROPIC_API_KEY
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 5
        volumeMounts:
        - name: output
          mountPath: /app/output
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: output
        persistentVolumeClaim:
          claimName: legal-analyzer-output
      - name: logs
        persistentVolumeClaim:
          claimName: legal-analyzer-logs
```

### 4. Service

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: legal-analyzer
  namespace: legal-analyzer
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 8000
    protocol: TCP
  selector:
    app: legal-analyzer
```

### 5. Deploy to Kubernetes

```bash
# Create deployment
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml

# Check status
kubectl get pods -n legal-analyzer
kubectl get svc -n legal-analyzer

# View logs
kubectl logs -n legal-analyzer -l app=legal-analyzer --tail=100

# Scale deployment
kubectl scale deployment legal-analyzer --replicas=5 -n legal-analyzer
```

---

## Cloud Platforms

### AWS Deployment

**Using Elastic Container Service (ECS)**

```bash
# Create ECR repository
aws ecr create-repository --repository-name legal-analyzer

# Push image
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

docker tag legal-analyzer:v1.0.0 \
  123456789.dkr.ecr.us-east-1.amazonaws.com/legal-analyzer:v1.0.0

docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/legal-analyzer:v1.0.0

# Deploy with CloudFormation or Terraform
# Create ECS task, service, and ALB
```

### Google Cloud Platform (GCP)

**Using Cloud Run**

```bash
# Configure gcloud
gcloud auth configure-docker

# Build and push
docker build -t gcr.io/PROJECT_ID/legal-analyzer:v1.0.0 .
docker push gcr.io/PROJECT_ID/legal-analyzer:v1.0.0

# Deploy
gcloud run deploy legal-analyzer \
  --image gcr.io/PROJECT_ID/legal-analyzer:v1.0.0 \
  --platform managed \
  --region us-central1 \
  --memory 2Gi \
  --set-env-vars="LLM_PROVIDER=claude,ANTHROPIC_API_KEY=sk-ant-..."
```

### Azure Deployment

**Using Container Instances**

```bash
# Push to Azure Container Registry
az acr build --registry legal-analyzer \
  --image legal-analyzer:v1.0.0 .

# Deploy container instances
az container create \
  --resource-group legal-analyzer-rg \
  --name legal-analyzer \
  --image legal-analyzer.azurecr.io/legal-analyzer:v1.0.0 \
  --environment-variables \
    LLM_PROVIDER=claude \
    LOG_LEVEL=INFO \
  --secure-environment-variables \
    ANTHROPIC_API_KEY=sk-ant-... \
  --cpu 2 --memory 2
```

---

## Performance Tuning

### Optimization Strategies

```bash
# 1. Enable caching
ENABLE_CACHE=true
CACHE_DIR=/var/cache/legal-analyzer

# 2. Database connection pooling
DATABASE_URL=postgresql+psycopg[binary]://user:pass@host/db?pool_size=20

# 3. Uvicorn workers
python -m uvicorn api:app --workers 4 --worker-class uvicorn.workers.UvicornWorker

# 4. GPU acceleration (if available)
export CUDA_VISIBLE_DEVICES=0
# Use in config: USE_GPU=true

# 5. Memory optimization
python -m uvicorn api:app --limit-concurrency 10 --limit-max-requests 1000
```

### Load Testing

```bash
# Install locust
pip install locust

# Create locustfile.py
from locust import HttpUser, task, between

class AnalyzerUser(HttpUser):
    wait_time = between(5, 10)
    
    @task
    def analyze_document(self):
        # Test endpoint
        pass

# Run load test
locust -f locustfile.py --host http://localhost:8000
```

---

## Monitoring & Maintenance

### Logging

```bash
# View logs
docker logs legal-analyzer

# Collect logs to file
docker logs legal-analyzer > analyzer.log 2>&1

# Stream logs
docker logs -f legal-analyzer
```

### Health Checks

```bash
# Health endpoint
curl http://localhost:8000/health

# Performance metrics
curl http://localhost:8000/metrics
```

### Backup & Recovery

```bash
# Backup database
pg_dump -h localhost -U legal_user legal_db > backup.sql

# Restore database
psql -h localhost -U legal_user legal_db < backup.sql

# Backup output data
tar -czf output_backup.tar.gz output/
```

### Updates & Deployments

```bash
# Blue-Green Deployment
# 1. Deploy new version to separate environment
# 2. Test thoroughly
# 3. Switch traffic to new version
# 4. Keep old version for rollback

# Rolling Update (Kubernetes)
kubectl set image deployment/legal-analyzer \
  api=legal-analyzer:v1.1.0 \
  -n legal-analyzer

# Monitor rollout
kubectl rollout status deployment/legal-analyzer -n legal-analyzer
```

---

## Security Best Practices

### 1. API Security

```yaml
# nginx.conf - Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

server {
    location /analyze {
        limit_req zone=api_limit burst=20;
    }
}
```

### 2. Environment Variables

```bash
# Never commit secrets
echo ".env" >> .gitignore
echo "secrets/" >> .gitignore

# Use environment variable files
docker run --env-file .env legal-analyzer:v1.0.0
```

### 3. TLS/SSL

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem

# Use in nginx
ssl_certificate /etc/nginx/ssl/cert.pem;
ssl_certificate_key /etc/nginx/ssl/key.pem;
```

### 4. Data Privacy

```python
# Sanitize output before storing
import hashlib
users_hash = hashlib.sha256(username.encode()).hexdigest()

# Never log sensitive information
logger.info(f"Processing document (hash: {doc_id_hash})")
logger.info(f"Risk score: {risk_score}")  # OK to log
# Avoid: logger.info(f"User: {user_email}")
```

### 5. Access Control

```yaml
# Kubernetes RBAC
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: legal-analyzer-role
rules:
- apiGroups: [""]
  resources: ["pods", "services"]
  verbs: ["get", "list"]
```

---

## Troubleshooting

### Common Issues

```bash
# Issue: Out of memory
# Solution: Increase Docker memory limit
docker run -m 4g legal-analyzer:v1.0.0

# Issue: Dependency conflicts
# Solution: Clean and reinstall
pip install --upgrade --force-reinstall -r requirements.txt

# Issue: OCR not working
# Solution: Verify Tesseract installation
which tesseract
tesseract --version

# Issue: API timeout
# Solution: Increase timeout, optimize LLM calls
LLM_TIMEOUT=120
REQUEST_TIMEOUT=300
```

---

## Monitoring Checklist

- [ ] Health checks passing
- [ ] No error logs increasing
- [ ] Response time stable
- [ ] Database connections healthy
- [ ] Disk space available
- [ ] Memory usage normal
- [ ] CPU usage under 80%
- [ ] API rate limiting working

---

## Quick Reference

```bash
# Development
python main.py

# Testing
pytest tests.py -v

# API Server
python -m uvicorn api:app --reload

# Docker
docker build -t legal-analyzer .
docker run -p 8000:8000 legal-analyzer

# Docker Compose
docker-compose up -d

# Kubernetes
kubectl apply -f deployment.yaml
kubectl get pods -n legal-analyzer

# Monitoring
curl http://localhost:8000/health
curl http://localhost:8000/metrics
```

---

**Last Updated**: January 2024  
**Status**: Production Ready ✓

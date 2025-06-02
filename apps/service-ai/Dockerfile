FROM python:3.13-slim AS builder
WORKDIR /app


RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY apps/service-ai/requirements.txt ./
RUN pip3 install --no-cache-dir --user -r requirements.txt

FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /root/.local /root/.local

COPY apps/service-ai/ ./

ENV PATH=/root/.local/bin:$PATH

EXPOSE 3002

CMD ["python3", "main.py"]


#!/bin/bash

set -e

DOCKER_USERNAME="yamazhen"

echo "Building Docker image..."

echo "Building API Gateway..."
docker build --platform linux/amd64 -t $DOCKER_USERNAME/api-gateway:latest -f apps/api-gateway/Dockerfile .

echo "Building Service System..."
docker build --platform linux/amd64 -t $DOCKER_USERNAME/service-system:latest -f apps/service-system/Dockerfile .

echo "Building Service AI..."
docker build --platform linux/amd64 -t $DOCKER_USERNAME/service-ai:latest -f apps/service-ai/Dockerfile .

echo "Building Service Study..."
docker build --platform linux/amd64 -t $DOCKER_USERNAME/service-study:latest -f apps/service-study/Dockerfile .

echo "All images built successfully."

echo "Pushing Docker images to Docker Hub..."

docker push $DOCKER_USERNAME/api-gateway:latest
docker push $DOCKER_USERNAME/service-system:latest
docker push $DOCKER_USERNAME/service-ai:latest
docker push $DOCKER_USERNAME/service-study:latest

echo "All images pushed successfully."

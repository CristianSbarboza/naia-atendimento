#!/bin/bash

# 1. Verify if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

# 2. Check if "rede_geral" network exists. If not, create it.
network_name="rede_geral"
if ! docker network ls --filter "name=$network_name" --format "{{.Name}}" | grep -q "^${network_name}$"; then
    echo "Network '$network_name' not found. Creating..."
    if ! docker network create "$network_name"; then
        echo "Error creating network '$network_name'."
        exit 1
    fi
else
    echo "Network '$network_name' already exists."
fi

# 3. Check if Postgres volume exists and warn about version incompatibility
volume_name="postgres_data"
if docker volume ls --filter "name=$volume_name" --format "{{.Name}}" | grep -q "^${volume_name}$"; then
    echo "Volume '$volume_name' already exists. If it was initialized with a previous PostgreSQL version, there might be compatibility issues."
    read -p "Do you want to remove the '$volume_name' volume to reinitialize the database? (y/N) " response
    if [[ "$response" =~ ^[yY] ]]; then
        echo "Removing volume '$volume_name'..."
        if ! docker volume rm "$volume_name"; then
            echo "Error removing volume '$volume_name'. Please check manually."
            exit 1
        fi
    else
        echo "Continuing without removing the volume. If the volume is incompatible, Postgres might not start correctly."
    fi
fi

# 4. Request sensitive values
read -p "Enter the new Postgres password: " POSTGRES_PASSWORD
read -p "Enter the new pgAdmin email: " PGADMIN_DEFAULT_EMAIL
read -p "Enter the password for n8n Redis: " N8N_REDIS_PASSWORD

# Export the variables so they're available to docker-compose
export POSTGRES_PASSWORD
export PGADMIN_DEFAULT_EMAIL
export N8N_REDIS_PASSWORD

# 5. Start containers via Docker Compose
echo "Starting containers via Docker Compose..."
if ! docker-compose up -d; then
    echo "Error starting containers. Trying to start existing containers..."
    if ! docker-compose start; then
        echo "Failed to start containers. Please check their status manually."
        exit 1
    fi
fi

# Wait for containers to start
echo "Waiting for containers to initialize..."
sleep 10

# 6. Display useful information
echo "-------------------------------------------"
echo "Services started successfully!"
echo ""
echo "Evolution API: http://localhost:8080"
echo "Evolution API KEY: KFZOm3Hc3GSNWwHBywEm67xYgjN8xGTH"
echo ""
echo "n8n:         http://localhost:5678"
echo ""
echo "Redis used by n8n:"
echo "    Host: host.docker.internal"
echo "    Port: 6380"
echo "    User: default"
echo "    Password: $N8N_REDIS_PASSWORD"
echo "-------------------------------------------"

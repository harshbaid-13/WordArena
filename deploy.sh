#!/bin/bash

# WordArena Deployment Script
# Run this script on your EC2 instance after initial setup

set -e  # Exit on error

echo "🚀 Starting WordArena Deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}Please do not run as root. Use your ubuntu user.${NC}"
   exit 1
fi

# Navigate to project directory
cd /home/ubuntu/WordArena || {
    echo -e "${RED}WordArena directory not found. Please clone/upload your project first.${NC}"
    exit 1
}

echo -e "${YELLOW}Step 1: Setting up Docker services...${NC}"
# Start PostgreSQL and Redis
docker-compose up -d
echo "Waiting for database to be ready..."
sleep 10

echo -e "${YELLOW}Step 2: Setting up backend...${NC}"
cd server

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}Backend .env file not found! Please create it from .env.production${NC}"
    exit 1
fi

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Push database schema
npm run prisma:push

cd ..

echo -e "${YELLOW}Step 3: Setting up frontend...${NC}"
cd client

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}Frontend .env.local not found. Creating from template...${NC}"
    cp ../client/.env.production .env.local 2>/dev/null || echo "NEXT_PUBLIC_SERVER_URL=http://localhost:8000" > .env.local
fi

# Install dependencies
npm install

# Build production version
npm run build

cd ..

echo -e "${YELLOW}Step 4: Setting up PM2...${NC}"
# Create logs directory
mkdir -p logs

# Start services with PM2
pm2 start ecosystem.config.js
pm2 save

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Check PM2 status: pm2 status"
echo "2. Check logs: pm2 logs"
echo "3. Configure Nginx (see DEPLOYMENT.md)"
echo "4. Set up SSL certificate (optional)"
echo ""
echo "Your application should be running on:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend: http://localhost:8000"


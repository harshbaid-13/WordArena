#!/bin/bash

# WordArena Update Script
# Use this script to update your application after code changes

set -e

echo "🔄 Updating WordArena..."

cd /home/ubuntu/WordArena || exit 1

# Pull latest changes (if using git)
if [ -d .git ]; then
    echo "Pulling latest changes from git..."
    git pull
fi

echo "Updating backend..."
cd server
npm install
npm run prisma:generate
npm run prisma:push
cd ..

echo "Updating frontend..."
cd client
npm install
npm run build
cd ..

echo "Restarting services..."
pm2 restart all

echo "✅ Update complete!"
pm2 status


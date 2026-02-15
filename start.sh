#!/bin/bash

# Agent Workspace Start Script
# Starts both the backend server and the frontend dev server

echo "🚀 Starting Agent Workspace..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  npm install
fi

if [ ! -d "server/node_modules" ]; then
  echo "📦 Installing server dependencies..."
  cd server && npm install && cd ..
fi

# Start the backend server
echo "🔧 Starting backend server on port 3001..."
cd server && npm start &
SERVER_PID=$!
cd ..

# Wait for server to start
sleep 2

# Start the frontend
echo "🎨 Starting frontend on port 5173..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Agent Workspace is running!"
echo ""
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3001"
echo ""
echo "   Login credentials:"
echo "   Username: benjamin"
echo "   Password: antikythera2026"
echo ""
echo "Press Ctrl+C to stop both servers."

# Wait for either process to exit
wait $SERVER_PID $FRONTEND_PID

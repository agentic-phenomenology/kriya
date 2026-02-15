#!/bin/bash

# Agent Workspace Start Script
# Starts both the backend server and the frontend dev server

echo "Starting Agent Workspace..."

# Load .env if it exists
if [ -f ".env" ]; then
  set -a
  source .env
  set +a
else
  echo "WARNING: No .env file found. Copy .env.example to .env and fill in your values."
  echo "  cp .env.example .env"
  exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm install
fi

if [ ! -d "server/node_modules" ]; then
  echo "Installing server dependencies..."
  cd server && npm install && cd ..
fi

# Start the backend server
echo "Starting backend server on port ${PORT:-3001}..."
cd server && npm start &
SERVER_PID=$!
cd ..

# Wait for server to start
sleep 2

# Start the frontend
echo "Starting frontend on port 5173..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Agent Workspace is running!"
echo ""
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:${PORT:-3001}"
echo ""
echo "Press Ctrl+C to stop both servers."

# Cleanup on exit
trap "kill $SERVER_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

# Wait for either process to exit
wait $SERVER_PID $FRONTEND_PID

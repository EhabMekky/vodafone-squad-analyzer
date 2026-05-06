#!/bin/bash

# Test the Vodafone Test Analyzer
# This script starts the server and opens it in your browser

echo "🚀 Starting Vodafone Test Report Analyzer..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies first..."
    npm install
    echo ""
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "ℹ️  No .env file found (email will be disabled)"
    echo "   To enable email: cp .env.example .env and configure"
    echo ""
fi

# Start the server in the background
echo "🌐 Starting server on http://localhost:3000"
echo ""
node server.js &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Open in browser
if command -v open &> /dev/null; then
    echo "🌐 Opening browser..."
    open http://localhost:3000
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
else
    echo "📍 Open this URL in your browser: http://localhost:3000"
fi

echo ""
echo "✅ Server is running!"
echo ""
echo "📤 Drag your Allure report to upload"
echo "📊 View instant analysis"
echo "📧 Email to @vodafone.com (if configured)"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Wait for server process
wait $SERVER_PID

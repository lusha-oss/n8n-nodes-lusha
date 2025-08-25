#!/bin/bash

# Development script for n8n-nodes-lusha
# This script rebuilds and updates the node in n8n-test automatically

echo "🔄 Rebuilding n8n-nodes-lusha..."

# Build the node
cd /Users/carolina.portela/Documents/n8n-nodes-lusha
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Fix the errors and try again."
    exit 1
fi

echo "✅ Build successful!"

# Copy the updated files to n8n-test
echo "📦 Updating files in n8n-test..."
cp -r dist/* /Users/carolina.portela/Documents/n8n-test/node_modules/n8n-nodes-lusha/dist/

echo "✅ Files updated!"
echo ""
echo "🚀 Starting n8n..."
echo "   URL: http://localhost:5678"
echo "   Press Ctrl+C to stop"
echo ""

# Start n8n
cd /Users/carolina.portela/Documents/n8n-test
npx n8n start

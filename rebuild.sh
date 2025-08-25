#!/bin/bash

echo "🔨 Building n8n-nodes-lusha..."
cd /Users/carolina.portela/Documents/n8n-nodes-lusha

# Build
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful"

# Copy icon
echo "📋 Copying icon..."
cp nodes/Lusha/lusha.svg dist/nodes/Lusha/

# Update in n8n
echo "🔄 Updating n8n custom nodes..."
rm -rf ~/.n8n/custom/n8n-nodes-lusha
cp -r dist ~/.n8n/custom/n8n-nodes-lusha

echo "🚀 Restarting n8n..."
cd /Users/carolina.portela/Documents/n8n-test
npx n8n start

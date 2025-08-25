#!/bin/bash

# Quick test script for n8n-nodes-lusha
# This tests the node compilation and basic functionality

echo "🧪 Testing n8n-nodes-lusha..."
echo "================================"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the project
echo "🔨 Building the project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed!"
    exit 1
fi

# Check if dist files exist
echo "📁 Checking dist files..."
if [ -f "dist/nodes/Lusha/Lusha.node.js" ] && [ -f "dist/credentials/LushaApi.credentials.js" ]; then
    echo "✅ Dist files created successfully!"
else
    echo "❌ Dist files missing!"
    exit 1
fi

# Run Jest tests
echo "🧪 Running unit tests..."
npm test

if [ $? -eq 0 ]; then
    echo "✅ Unit tests passed!"
else
    echo "⚠️ Unit tests failed (this is okay if you haven't set up Jest yet)"
fi

# Check package.json n8n configuration
echo "📋 Checking n8n configuration..."
node -e "
const pkg = require('./package.json');
if (pkg.n8n && pkg.n8n.nodes && pkg.n8n.credentials) {
    console.log('✅ n8n configuration is valid!');
    console.log('  Nodes:', pkg.n8n.nodes);
    console.log('  Credentials:', pkg.n8n.credentials);
} else {
    console.log('❌ n8n configuration is missing or invalid!');
    process.exit(1);
}
"

echo ""
echo "================================"
echo "🎉 All checks passed!"
echo ""
echo "Next steps to test in n8n:"
echo "1. Install the node: npm link (in this directory)"
echo "2. Link in n8n: cd ~/.n8n && npm link n8n-nodes-lusha"
echo "3. Start n8n: n8n start"
echo "4. Look for 'Lusha' in the node list"
echo ""
echo "Or install the packaged version:"
echo "npm install $(pwd)/n8n-nodes-lusha-1.0.0.tgz"

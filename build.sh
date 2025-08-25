#!/bin/bash

# Clean build script for n8n-nodes-lusha

echo "🧹 Cleaning old build files..."
rm -rf dist/

echo "🔨 Building TypeScript files..."
npx tsc

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful!"
else
    echo "❌ TypeScript compilation failed!"
    exit 1
fi

echo "🎨 Copying icons..."
npx gulp build:icons

if [ $? -eq 0 ]; then
    echo "✅ Icon copying successful!"
else
    echo "❌ Icon copying failed!"
    exit 1
fi

echo ""
echo "🎉 Build complete!"
echo ""
echo "📁 Files created in dist/ directory:"
ls -la dist/
echo ""
echo "📦 To test locally, run:"
echo "   npm link"
echo "   Then in your n8n installation: npm link n8n-nodes-lusha"

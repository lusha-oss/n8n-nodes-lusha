#!/bin/bash

echo "🔍 Debugging n8n-nodes-lusha display issues..."
echo "=============================================="

# Check for multiple installations
echo "1. Checking for duplicate installations..."
find ~ -name "n8n-nodes-lusha" -type d 2>/dev/null | grep -v node_modules | head -10

echo ""
echo "2. Checking current build date..."
ls -la /Users/carolina.portela/Documents/n8n-nodes-lusha/dist/nodes/Lusha/Lusha.node.js

echo ""
echo "3. Cleaning and rebuilding..."
cd /Users/carolina.portela/Documents/n8n-nodes-lusha
rm -rf dist/
npm run build

echo ""
echo "4. Verifying displayOptions in built file..."
grep -A 2 "displayOptions" dist/nodes/Lusha/Lusha.node.js | head -20

echo ""
echo "5. Reinstalling in n8n-test..."
cd /Users/carolina.portela/Documents/n8n-test
rm -rf node_modules/n8n-nodes-lusha
npm install ../n8n-nodes-lusha

echo ""
echo "✅ Cleanup complete! Now:"
echo "1. Start n8n: cd /Users/carolina.portela/Documents/n8n-test && npx n8n start"
echo "2. Open in incognito/private window"
echo "3. Hard refresh (Cmd+Shift+R)"
echo "4. Create a new workflow (don't reuse old ones)"
echo "5. Add a fresh Lusha node"

#!/bin/bash

# Watch for changes and auto-rebuild
# Requires: npm install -g nodemon (if not installed)

echo "👁️  Watching for changes in n8n-nodes-lusha..."
echo "   Changes will trigger automatic rebuild"
echo "   Press Ctrl+C to stop"
echo ""

cd /Users/carolina.portela/Documents/n8n-nodes-lusha

# Watch TypeScript files and rebuild on change
nodemon --watch nodes --watch credentials -e ts --exec "npm run build && echo '✅ Rebuilt at' \$(date +%H:%M:%S) && cp -r dist/* /Users/carolina.portela/Documents/n8n-test/node_modules/n8n-nodes-lusha/dist/"

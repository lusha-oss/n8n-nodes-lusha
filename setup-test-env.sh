#!/bin/bash

# Setup script for testing n8n-nodes-lusha locally

echo "🚀 Setting up n8n test environment..."
echo "======================================"

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "nodes" ]; then
    echo "❌ Please run this script from the n8n-nodes-lusha directory"
    exit 1
fi

# Create a test environment directory
TEST_DIR="../n8n-test-environment"
echo "📁 Creating test environment at $TEST_DIR"

# Create and navigate to test directory
mkdir -p $TEST_DIR
cd $TEST_DIR

# Initialize a new npm project
echo "📦 Initializing test project..."
npm init -y > /dev/null 2>&1

# Install n8n locally in the test environment
echo "📥 Installing n8n (this may take a few minutes)..."
npm install n8n

# Create a custom nodes directory
mkdir -p .n8n/custom

# Link your Lusha node
echo "🔗 Linking your Lusha node..."
cp -r ../n8n-nodes-lusha .n8n/custom/

# Create a start script
cat > start-n8n.sh << 'EOF'
#!/bin/bash
export N8N_CUSTOM_EXTENSIONS=".n8n/custom"
export N8N_PORT=5678
echo "Starting n8n on http://localhost:5678"
npx n8n start
EOF

chmod +x start-n8n.sh

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start n8n with your Lusha node:"
echo "  cd $TEST_DIR"
echo "  ./start-n8n.sh"
echo ""
echo "Or run directly:"
echo "  cd $TEST_DIR && npx n8n start"

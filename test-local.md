# Testing n8n-nodes-lusha Locally

## Method 1: Using npm link (Development)

```bash
# In your n8n-nodes-lusha directory
cd /Users/carolina.portela/Documents/n8n-nodes-lusha
npm link

# Find your n8n installation (usually in ~/.n8n)
cd ~/.n8n
npm link n8n-nodes-lusha

# Start n8n
n8n start
```

## Method 2: Direct Installation in n8n

```bash
# Install directly from your local package
cd ~/.n8n/custom
npm install /Users/carolina.portela/Documents/n8n-nodes-lusha/n8n-nodes-lusha-1.0.0.tgz

# Restart n8n
n8n start
```

## Method 3: Docker Testing

```bash
# Create a test directory
mkdir ~/n8n-test-env
cd ~/n8n-test-env

# Copy your node
cp -r /Users/carolina.portela/Documents/n8n-nodes-lusha ./

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3'
services:
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    volumes:
      - ./n8n-nodes-lusha:/home/node/.n8n/custom/n8n-nodes-lusha
      - ./data:/home/node/.n8n
    environment:
      - N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom
EOF

# Run n8n
docker-compose up
```

## Test Workflows

Once n8n is running (http://localhost:5678), create these test workflows:

### Test 1: Contact Enrichment
1. Add a "Manual Trigger" node
2. Add your "Lusha" node
3. Configure:
   - Resource: Contact
   - Operation: Enrich
   - Fill in test data (e.g., firstName: "John", lastName: "Doe", companyName: "Microsoft")
4. Execute workflow

### Test 2: Company Enrichment
1. Add a "Manual Trigger" node
2. Add your "Lusha" node
3. Configure:
   - Resource: Company
   - Operation: Enrich
   - Domain: "microsoft.com"
4. Execute workflow

### Test 3: Prospecting Search
1. Add a "Manual Trigger" node
2. Add your "Lusha" node
3. Configure:
   - Resource: Prospecting
   - Operation: Search Contacts
   - Page: 0
   - Page Size: 10
4. Execute workflow

### Test 4: Bulk Processing (with Set node)
1. Add a "Manual Trigger" node
2. Add a "Set" node with multiple items:
   ```json
   [
     {"firstName": "Bill", "lastName": "Gates", "companyName": "Microsoft"},
     {"firstName": "Tim", "lastName": "Cook", "companyName": "Apple"},
     {"firstName": "Sundar", "lastName": "Pichai", "companyName": "Google"}
   ]
   ```
3. Add your "Lusha" node for contact enrichment
4. Execute workflow

## Debugging Tips

1. **Check n8n logs**: 
   ```bash
   n8n start --tunnel # For webhook testing
   n8n start --log-level=debug # For detailed logs
   ```

2. **Check if node is loaded**:
   - Go to n8n UI
   - Try to add a new node
   - Search for "Lusha"
   - It should appear in the list

3. **Common Issues**:
   - If node doesn't appear: Check `~/.n8n/custom/` directory
   - If credentials fail: Verify API key in Lusha Dashboard
   - If requests fail: Check network/firewall settings

## API Testing (without n8n)

Test your API key directly:
```bash
curl -X GET "https://api.lusha.com/v2/person?firstName=Bill&lastName=Gates&companyName=Microsoft" \
  -H "api_key: YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

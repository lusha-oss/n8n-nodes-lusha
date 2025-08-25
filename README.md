# n8n-nodes-lusha

This is an n8n community node that integrates [Lusha](https://www.lusha.com/) with n8n, enabling contact and company data enrichment directly in your workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Features

This node provides comprehensive access to Lusha's API capabilities:

### 🧑‍💼 Contact Operations

- **Single Contact Enrichment** - Find contact details using name & company, email, or LinkedIn URL
- **Bulk Contact Enrichment** - Enrich up to 100 contacts in a single operation
- **Contact Prospecting** - Search for contacts with advanced filters
- **Smart Enrichment** - Enrich all, new, or specific contacts from search results

### 🏢 Company Operations

- **Single Company Enrichment** - Get company details using domain or company name
- **Bulk Company Enrichment** - Enrich up to 100 companies at once
- **Company Prospecting** - Search for companies with comprehensive filters
- **Flexible Selection** - Enrich all or specific companies from search results

### 🔍 Advanced Filtering

- **Contact Filters**: Departments, seniority levels, job titles, locations, existing data points
- **Company Filters**: Industries, sub-industries, employee count, revenue ranges, technologies, locations, SIC/NAICS codes
- **Smart Pagination**: Navigate through large result sets efficiently

## Installation

### Community Node (Recommended)

In your n8n instance:

1. Go to **Settings** > **Community Nodes**
2. Click **Install a community node**
3. Enter: `n8n-nodes-lusha`
4. Click **Install**

### Manual Installation

```bash
# Navigate to your n8n custom nodes folder
cd ~/.n8n/custom

# Clone this repository
git clone https://github.com/lusha-oss/n8n-nodes-lusha.git

# Install dependencies
cd n8n-nodes-lusha
npm install

# Build the node
npm run build

# Restart n8n
```

## Credentials

To use this node, you'll need a Lusha API key:

1. Sign up for a [Lusha account](https://www.lusha.com/)
2. Navigate to Settings > API
3. Generate your API key
4. In n8n, add new Lusha credentials with your API key

## Usage Examples

### Example 1: Enrich Single Contact

Find contact information using a person's name and company:

- **Resource**: Contact
- **Operation**: Enrich Single
- **Search By**: Name and Company
- **First Name**: John
- **Last Name**: Doe
- **Company Name**: Acme Corp

### Example 2: Bulk Company Enrichment

Enrich multiple companies from a spreadsheet:

- **Resource**: Company
- **Operation**: Enrich Bulk
- **Companies JSON**: Connect from previous node or provide JSON array

### Example 3: Contact Prospecting

Search for sales leaders in technology companies:

- **Resource**: Prospecting
- **Operation**: Search Contacts
- **Departments**: Sales
- **Seniority**: Director, Vice President, C-Suite
- **Industries**: Technology

### Example 4: Enrich Search Results

After running a prospecting search:

- **Resource**: Prospecting
- **Operation**: Enrich Contacts
- **Selection Type**: All Contacts
- **Request ID**: (automatically passed from search)

## Parameters

### Contact Enrichment

- **Search Methods**: Name & Company, Email, LinkedIn URL
- **Filter Options**: All data, emails only, phones only

### Company Enrichment

- **Search Methods**: Domain, Company Name
- **Bulk Format**: JSON array with company identifiers

### Prospecting Filters

#### Contact Filters

- **Job Titles**: Free text, comma-separated
- **Departments**: Dropdown selection (Sales, Marketing, IT, etc.)
- **Seniority**: Levels from Intern to Founder
- **Locations**: Countries, states, cities
- **Data Points**: Filter by available contact information

#### Company Filters

- **Industries**: Main industry categories
- **Sub-Industries**: Specific industry segments
- **Employee Count**: Size ranges from 1-10 to 10,000+
- **Revenue**: Min/Max revenue selection
- **Locations**: Company headquarters
- **Technologies**: Tech stack used
- **Codes**: SIC and NAICS classifications

## Error Handling

The node includes comprehensive error handling:

- Invalid API credentials
- Rate limiting responses
- Invalid input data
- Empty results handling
- Network timeouts

## Rate Limits

Please be aware of Lusha's API rate limits:

- Check your plan's specific limits
- The node handles responses appropriately
- Consider adding delays for large bulk operations

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/n8n-nodes-lusha/issues)
- **n8n Community**: [n8n Community Forum](https://community.n8n.io)
- **Lusha API Docs**: [Lusha API Documentation](https://docs.lusha.com/apis)

## License

[MIT](LICENSE.md)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Version History

### 1.0.0

- Initial release
- Full contact and company enrichment
- Prospecting search and enrichment
- Bulk operations support
- Advanced filtering options

## Credits

Created by [Your Name]
Based on the Lusha API v2

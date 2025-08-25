import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	IHttpRequestOptions,
	IDataObject,
} from 'n8n-workflow';

export class Lusha implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Lusha',
		name: 'lusha',
		icon: 'file:lusha.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Lusha API integration for contact and company enrichment',
		defaults: {
			name: 'Lusha',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'lushaApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Contact',
						value: 'contact',
					},
					{
						name: 'Company',
						value: 'company',
					},
					{
						name: 'Prospecting',
						value: 'prospecting',
					},
				],
				default: 'contact',
				description: 'The resource to operate on',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['contact'],
					},
				},
				options: [
					{
						name: 'Enrich Single',
						value: 'enrich',
						description: 'Enrich a single contact',
					},
					{
						name: 'Enrich Bulk',
						value: 'enrichBulk',
						description: 'Enrich multiple contacts (up to 100)',
					},
				],
				default: 'enrich',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['company'],
					},
				},
				options: [
					{
						name: 'Enrich Single',
						value: 'enrich',
						description: 'Enrich a single company',
					},
					{
						name: 'Enrich Bulk',
						value: 'enrichBulk',
						description: 'Enrich multiple companies (up to 100)',
					},
				],
				default: 'enrich',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['prospecting'],
					},
				},
				options: [
					{
						name: 'Search Contacts',
						value: 'searchContacts',
						description: 'Search for contacts with filters',
					},
					{
						name: 'Enrich Contacts',
						value: 'enrichContacts',
						description: 'Enrich contacts from search results',
					},
					{
						name: 'Search Companies',
						value: 'searchCompanies',
						description: 'Search for companies with filters',
					},
					{
						name: 'Enrich Companies',
						value: 'enrichCompanies',
						description: 'Enrich companies from search results',
					},
				],
				default: 'searchContacts',
			},
			// Single Contact Enrichment Fields
			{
				displayName: 'Search By',
				name: 'searchBy',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrich'],
					},
				},
				options: [
					{
						name: 'Name and Company',
						value: 'nameCompany',
						description: 'Search using name and company information',
					},
					{
						name: 'Email',
						value: 'email',
						description: 'Search using email address',
					},
					{
						name: 'LinkedIn URL',
						value: 'linkedin',
						description: 'Search using LinkedIn profile URL',
					},
				],
				default: 'nameCompany',
				description: 'How to search for the contact',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrich'],
						searchBy: ['nameCompany'],
					},
				},
				default: '',
				description: 'First name of the contact',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrich'],
						searchBy: ['nameCompany'],
					},
				},
				default: '',
				description: 'Last name of the contact',
			},
			{
				displayName: 'Company Name',
				name: 'companyName',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrich'],
						searchBy: ['nameCompany'],
					},
				},
				default: '',
				description: 'Company name where the contact works',
			},
			{
				displayName: 'Company Domain',
				name: 'companyDomain',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrich'],
						searchBy: ['nameCompany'],
					},
				},
				default: '',
				placeholder: 'example.com',
				description: 'Company domain (e.g., example.com)',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrich'],
						searchBy: ['email'],
					},
				},
				default: '',
				placeholder: 'john.doe@example.com',
				description: 'Email address of the contact',
			},
			{
				displayName: 'LinkedIn URL',
				name: 'linkedinUrl',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrich'],
						searchBy: ['linkedin'],
					},
				},
				default: '',
				placeholder: 'https://www.linkedin.com/in/johndoe',
				description: 'LinkedIn profile URL',
			},
			// Filter options for Single Contact
			{
				displayName: 'Filter By',
				name: 'filterBySingle',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrich'],
					},
				},
				options: [
					{
						name: 'All Data',
						value: '',
						description: 'Return all available data',
					},
					{
						name: 'Emails Only',
						value: 'emails',
						description: 'Return only email addresses',
					},
					{
						name: 'Phones Only',
						value: 'phones',
						description: 'Return only phone numbers',
					},
				],
				default: '',
				description: 'Filter the type of data to return',
			},
			// Bulk Contact Enrichment Fields
			{
				displayName: 'Contacts JSON',
				name: 'contactsJson',
				type: 'json',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrichBulk'],
					},
				},
				default: '[\n  {\n    "contactId": "1",\n    "fullName": "John Doe",\n    "companies": [{"name": "Acme Corp", "isCurrent": true}]\n  }\n]',
				description: 'Array of contact objects to enrich (max 100). Each contact needs a unique contactId and either: LinkedIn URL, full name + company, or email',
			},
			{
				displayName: 'Filter By',
				name: 'filterBy',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrichBulk'],
					},
				},
				options: [
					{
						name: 'All Data',
						value: '',
						description: 'Return all available data',
					},
					{
						name: 'Emails Only',
						value: 'emails',
						description: 'Return only email addresses',
					},
					{
						name: 'Phones Only',
						value: 'phones',
						description: 'Return only phone numbers',
					},
				],
				default: '',
				description: 'Filter the type of data to return',
			},
			// Single Company Enrichment Fields
			{
				displayName: 'Search By',
				name: 'companySearchBy',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['enrich'],
					},
				},
				options: [
					{
						name: 'Domain',
						value: 'domain',
						description: 'Search using company domain',
					},
					{
						name: 'Company Name',
						value: 'name',
						description: 'Search using company name',
					},
				],
				default: 'domain',
				description: 'How to search for the company',
			},
			{
				displayName: 'Domain',
				name: 'domain',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['enrich'],
						companySearchBy: ['domain'],
					},
				},
				default: '',
				placeholder: 'example.com',
				description: 'Company domain (e.g., example.com)',
			},
			{
				displayName: 'Company Name',
				name: 'company',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['enrich'],
						companySearchBy: ['name'],
					},
				},
				default: '',
				placeholder: 'Acme Corporation',
				description: 'Company name',
			},
			// Bulk Company Enrichment Fields
			{
				displayName: 'Companies JSON',
				name: 'companiesJson',
				type: 'json',
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['enrichBulk'],
					},
				},
				default: '[\n  {\n    "id": "1",\n    "domain": "example.com"\n  },\n  {\n    "id": "2",\n    "name": "Acme Corporation"\n  }\n]',
				description: 'Array of company objects to enrich (max 100). Each company needs a unique id and either: domain, company name, or fqdn',
			},
			// Prospecting Contact Search Fields
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['prospecting'],
						operation: ['searchContacts', 'searchCompanies'],
					},
				},
				default: 0,
				description: 'Page number (starts at 0)',
			},
			{
				displayName: 'Page Size',
				name: 'size',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['prospecting'],
						operation: ['searchContacts', 'searchCompanies'],
					},
				},
				default: 40,
				description: 'Number of results per page (10-40)',
			},
			// Contact Filters
			{
				displayName: 'Contact Filters',
				name: 'contactFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: {
					show: {
						resource: ['prospecting'],
						operation: ['searchContacts'],
					},
				},
				options: [
					{
						displayName: 'Job Titles',
						name: 'jobTitles',
						type: 'string',
						default: '',
						placeholder: 'CEO,CTO,VP Sales',
						description: 'Comma-separated job titles',
					},
					{
						displayName: 'Departments',
						name: 'departments',
						type: 'multiOptions',
						options: [
							{ name: 'Business Development', value: 'Business Development' },
							{ name: 'Consulting', value: 'Consulting' },
							{ name: 'Customer Service', value: 'Customer Service' },
							{ name: 'Engineering & Technical', value: 'Engineering & Technical' },
							{ name: 'Finance', value: 'Finance' },
							{ name: 'General Management', value: 'General Management' },
							{ name: 'Human Resources', value: 'Human Resources' },
							{ name: 'Information Technology', value: 'Information Technology' },
							{ name: 'Legal', value: 'Legal' },
							{ name: 'Marketing', value: 'Marketing' },
							{ name: 'Operations', value: 'Operations' },
							{ name: 'Product', value: 'Product' },
							{ name: 'Research & Analytics', value: 'Research & Analytics' },
							{ name: 'Sales', value: 'Sales' },
						],
						default: [],
						description: 'Select departments',
					},
					{
						displayName: 'Seniority',
						name: 'seniority',
						type: 'multiOptions',
						options: [
							{ name: 'Founder', value: 10 },
							{ name: 'C-Suite', value: 9 },
							{ name: 'Vice President', value: 8 },
							{ name: 'Partner', value: 7 },
							{ name: 'Director', value: 6 },
							{ name: 'Manager', value: 5 },
							{ name: 'Senior', value: 4 },
							{ name: 'Entry', value: 3 },
							{ name: 'Intern', value: 2 },
							{ name: 'Other', value: 1 },
						],
						default: [],
						description: 'Select seniority levels',
					},
					{
						displayName: 'Countries',
						name: 'countries',
						type: 'multiOptions',
						options: [
							{ name: 'United States', value: 'United States' },
							{ name: 'United Kingdom', value: 'United Kingdom' },
							{ name: 'Canada', value: 'Canada' },
							{ name: 'Australia', value: 'Australia' },
							{ name: 'Germany', value: 'Germany' },
							{ name: 'France', value: 'France' },
							{ name: 'Netherlands', value: 'Netherlands' },
							{ name: 'India', value: 'India' },
							{ name: 'Brazil', value: 'Brazil' },
							{ name: 'Singapore', value: 'Singapore' },
							{ name: 'Israel', value: 'Israel' },
							{ name: 'Spain', value: 'Spain' },
							{ name: 'Italy', value: 'Italy' },
							{ name: 'Mexico', value: 'Mexico' },
							{ name: 'Japan', value: 'Japan' },
						],
						default: [],
						description: 'Select countries',
					},
					{
						displayName: 'States',
						name: 'states',
						type: 'string',
						default: '',
						placeholder: 'California,New York,Texas',
						description: 'Comma-separated states',
					},
					{
						displayName: 'Cities',
						name: 'cities',
						type: 'string',
						default: '',
						placeholder: 'San Francisco,New York,London',
						description: 'Comma-separated cities',
					},
					{
						displayName: 'Existing Data Points',
						name: 'existingDataPoints',
						type: 'multiOptions',
						options: [
							{ name: 'Phone', value: 'phone' },
							{ name: 'Work Email', value: 'work_email' },
							{ name: 'Mobile Phone', value: 'mobile_phone' },
							{ name: 'Direct Phone', value: 'direct_phone' },
						],
						default: [],
						description: 'Filter by contacts that have these data points',
					},
				],
			},
			// Company Filters for Contact Search
			{
				displayName: 'Company Filters',
				name: 'companyFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: {
					show: {
						resource: ['prospecting'],
						operation: ['searchContacts', 'searchCompanies'],
					},
				},
				options: [
					{
						displayName: 'Company Names',
						name: 'names',
						type: 'string',
						default: '',
						placeholder: 'Microsoft,Apple,Google',
						description: 'Comma-separated company names',
					},
					{
						displayName: 'Domains',
						name: 'domains',
						type: 'string',
						default: '',
						placeholder: 'microsoft.com,apple.com',
						description: 'Comma-separated company domains',
					},
					{
						displayName: 'Employee Count',
						name: 'employeeCountRanges',
						type: 'multiOptions',
						options: [
							{ name: '1-10', value: '1-10' },
							{ name: '11-50', value: '11-50' },
							{ name: '51-200', value: '51-200' },
							{ name: '201-500', value: '201-500' },
							{ name: '501-1000', value: '501-1000' },
							{ name: '1001-5000', value: '1001-5000' },
							{ name: '5001-10000', value: '5001-10000' },
							{ name: '10001+', value: '10001+' },
						],
						default: [],
						description: 'Select employee count ranges',
					},
					{
						displayName: 'Industries',
						name: 'industries',
						type: 'multiOptions',
						options: [
							{ name: 'Technology, Information & Media', value: 1 },
							{ name: 'Finance', value: 2 },
							{ name: 'Healthcare', value: 3 },
							{ name: 'Retail', value: 4 },
							{ name: 'Manufacturing', value: 5 },
							{ name: 'Education', value: 6 },
							{ name: 'Real Estate', value: 7 },
							{ name: 'Business Services', value: 8 },
							{ name: 'Entertainment', value: 9 },
							{ name: 'Transportation & Logistics', value: 10 },
							{ name: 'Hospitality & Tourism', value: 11 },
							{ name: 'Construction', value: 12 },
							{ name: 'Energy & Utilities', value: 13 },
							{ name: 'Government & Public Sector', value: 14 },
							{ name: 'Non-Profit', value: 15 },
							{ name: 'Agriculture', value: 16 },
							{ name: 'Telecommunications', value: 17 },
							{ name: 'Insurance', value: 18 },
							{ name: 'Legal', value: 19 },
							{ name: 'Consulting', value: 20 },
						],
						default: [],
						description: 'Select main industries',
					},
					{
						displayName: 'Revenue Min',
						name: 'revenueMin',
						type: 'options',
						options: [
							{ name: 'Any', value: 0 },
							{ name: '$0', value: 0 },
							{ name: '$1M', value: 1000000 },
							{ name: '$10M', value: 10000000 },
							{ name: '$50M', value: 50000000 },
							{ name: '$100M', value: 100000000 },
							{ name: '$500M', value: 500000000 },
							{ name: '$1B', value: 1000000000 },
						],
						default: 0,
						description: 'Minimum revenue',
					},
					{
						displayName: 'Revenue Max',
						name: 'revenueMax',
						type: 'options',
						options: [
							{ name: 'Any', value: 0 },
							{ name: '$1M', value: 1000000 },
							{ name: '$10M', value: 10000000 },
							{ name: '$50M', value: 50000000 },
							{ name: '$100M', value: 100000000 },
							{ name: '$500M', value: 500000000 },
							{ name: '$1B', value: 1000000000 },
							{ name: '$10B+', value: 10000000000 },
						],
						default: 0,
						description: 'Maximum revenue',
					},
					{
						displayName: 'Sub Industries',
						name: 'subIndustries',
						type: 'multiOptions',
						options: [
							{ name: 'Software Development', value: 1 },
							{ name: 'Internet Services', value: 2 },
							{ name: 'Financial Services', value: 3 },
							{ name: 'Biotechnology', value: 4 },
							{ name: 'Pharmaceuticals', value: 5 },
							{ name: 'Medical Devices', value: 6 },
							{ name: 'Telecommunications', value: 7 },
							{ name: 'Semiconductors', value: 8 },
							{ name: 'Cloud Computing', value: 9 },
							{ name: 'E-Commerce', value: 10 },
							{ name: 'Cybersecurity', value: 11 },
							{ name: 'Artificial Intelligence', value: 12 },
							{ name: 'Data Analytics', value: 13 },
							{ name: 'Digital Marketing', value: 14 },
							{ name: 'Fintech', value: 15 },
						],
						default: [],
						description: 'Select sub-industries',
					},
					{
						displayName: 'Company Countries',
						name: 'companyCountries',
						type: 'multiOptions',
						options: [
							{ name: 'United States', value: 'United States' },
							{ name: 'United Kingdom', value: 'United Kingdom' },
							{ name: 'Canada', value: 'Canada' },
							{ name: 'Australia', value: 'Australia' },
							{ name: 'Germany', value: 'Germany' },
							{ name: 'France', value: 'France' },
							{ name: 'Netherlands', value: 'Netherlands' },
							{ name: 'India', value: 'India' },
							{ name: 'Brazil', value: 'Brazil' },
							{ name: 'Singapore', value: 'Singapore' },
							{ name: 'Israel', value: 'Israel' },
							{ name: 'Spain', value: 'Spain' },
							{ name: 'Italy', value: 'Italy' },
							{ name: 'Mexico', value: 'Mexico' },
							{ name: 'Japan', value: 'Japan' },
						],
						default: [],
						description: 'Select company headquarters countries',
					},
					{
						displayName: 'SIC Codes',
						name: 'sicCodes',
						type: 'string',
						default: '',
						placeholder: '7372,7373,7374',
						description: 'Comma-separated SIC codes',
					},
					{
						displayName: 'NAICS Codes',
						name: 'naicsCodes',
						type: 'string',
						default: '',
						placeholder: '511210,541511,541512',
						description: 'Comma-separated NAICS codes',
					},
					{
						displayName: 'Technologies',
						name: 'technologies',
						type: 'string',
						default: '',
						placeholder: 'Salesforce,HubSpot,AWS',
						description: 'Comma-separated technologies used by companies',
					},
					{
						displayName: 'Intent Topics',
						name: 'intentTopics',
						type: 'string',
						default: '',
						placeholder: 'Digital Transformation,Cloud Migration',
						description: 'Comma-separated intent topics',
					},
				],
			},
			// Prospecting Enrich Contacts Fields
			{
				displayName: 'Request ID',
				name: 'requestId',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['prospecting'],
						operation: ['enrichContacts', 'enrichCompanies'],
					},
				},
				default: '',
				required: true,
				description: 'Request ID from the search results',
			},
			{
				displayName: 'Selection Type',
				name: 'selectionType',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['prospecting'],
						operation: ['enrichContacts'],
					},
				},
				options: [
					{
						name: 'All Contacts',
						value: 'all',
						description: 'Enrich all contacts from search',
					},
					{
						name: 'New Contacts Only',
						value: 'new',
						description: 'Enrich only new contacts (not previously shown)',
					},
					{
						name: 'Revealed Contacts Only',
						value: 'revealed',
						description: 'Enrich only previously revealed contacts',
					},
					{
						name: 'Custom Selection',
						value: 'custom',
						description: 'Specify contact IDs manually',
					},
				],
				default: 'custom',
				description: 'How to select contacts for enrichment',
			},
			{
				displayName: 'Contact IDs',
				name: 'contactIds',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['prospecting'],
						operation: ['enrichContacts'],
						selectionType: ['custom'],
					},
				},
				default: '',
				placeholder: 'id1,id2,id3',
				description: 'Comma-separated list of contact IDs to enrich',
			},
			{
				displayName: 'Selection Type',
				name: 'companySelectionType',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['prospecting'],
						operation: ['enrichCompanies'],
					},
				},
				options: [
					{
						name: 'All Companies',
						value: 'all',
						description: 'Enrich all companies from search',
					},
					{
						name: 'Custom Selection',
						value: 'custom',
						description: 'Specify company IDs manually',
					},
				],
				default: 'custom',
				description: 'How to select companies for enrichment',
			},
			{
				displayName: 'Company IDs',
				name: 'companyIds',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['prospecting'],
						operation: ['enrichCompanies'],
						companySelectionType: ['custom'],
					},
				},
				default: '',
				placeholder: 'id1,id2,id3',
				description: 'Comma-separated list of company IDs to enrich',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('lushaApi');

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let response;

				if (resource === 'contact') {
					if (operation === 'enrich') {
						response = await enrichContact.call(this, credentials, i);
					} else if (operation === 'enrichBulk') {
						response = await enrichContactsBulk.call(this, credentials, i);
					}
				} else if (resource === 'company') {
					if (operation === 'enrich') {
						response = await enrichCompany.call(this, credentials, i);
					} else if (operation === 'enrichBulk') {
						response = await enrichCompaniesBulk.call(this, credentials, i);
					}
				} else if (resource === 'prospecting') {
					if (operation === 'searchContacts') {
						response = await searchContacts.call(this, credentials, i);
					} else if (operation === 'enrichContacts') {
						response = await enrichProspectingContacts.call(this, credentials, i);
					} else if (operation === 'searchCompanies') {
						response = await searchCompanies.call(this, credentials, i);
					} else if (operation === 'enrichCompanies') {
						response = await enrichProspectingCompanies.call(this, credentials, i);
					}
				}

				if (response) {
					// For bulk operations that return arrays, handle appropriately
					if (Array.isArray(response)) {
						response.forEach((item: any) => {
							returnData.push({
								json: item,
								pairedItem: { item: i },
							});
						});
					} else {
						returnData.push({
							json: response,
							pairedItem: { item: i },
						});
					}
				}

			} catch (error) {
				if (this.continueOnFail()) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					returnData.push({
						json: { 
							error: errorMessage,
							resource,
							operation,
							itemIndex: i 
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}

// Single contact enrichment
async function enrichContact(this: IExecuteFunctions, credentials: any, itemIndex: number): Promise<any> {
	const params: IDataObject = {};
	const searchBy = this.getNodeParameter('searchBy', itemIndex, 'nameCompany') as string;
	const filterBy = this.getNodeParameter('filterBySingle', itemIndex, '') as string;
	
	if (searchBy === 'nameCompany') {
		const firstName = this.getNodeParameter('firstName', itemIndex, '') as string;
		const lastName = this.getNodeParameter('lastName', itemIndex, '') as string;
		const companyName = this.getNodeParameter('companyName', itemIndex, '') as string;
		const companyDomain = this.getNodeParameter('companyDomain', itemIndex, '') as string;

		if (firstName) params.firstName = firstName;
		if (lastName) params.lastName = lastName;
		if (companyName) params.companyName = companyName;
		if (companyDomain) params.companyDomain = companyDomain;
	} else if (searchBy === 'email') {
		const email = this.getNodeParameter('email', itemIndex, '') as string;
		if (email) params.email = email;
	} else if (searchBy === 'linkedin') {
		const linkedinUrl = this.getNodeParameter('linkedinUrl', itemIndex, '') as string;
		if (linkedinUrl) params.linkedinUrl = linkedinUrl;
	}

	// Add filter parameters
	if (filterBy === 'emails') {
		params.revealEmails = true;
		params.revealPhones = false;
	} else if (filterBy === 'phones') {
		params.revealEmails = false;
		params.revealPhones = true;
	}

	const options: IHttpRequestOptions = {
		method: 'GET',
		url: 'https://api.lusha.com/v2/person',
		qs: params,
		headers: {
			'api_key': credentials.apiKey as string,
			'Content-Type': 'application/json',
			'Accept': 'application/json',
		},
		json: true,
	};

	return await this.helpers.httpRequest(options);
}

// Bulk contact enrichment
async function enrichContactsBulk(this: IExecuteFunctions, credentials: any, itemIndex: number): Promise<any> {
	const contactsJson = this.getNodeParameter('contactsJson', itemIndex) as string | object;
	const filterBy = this.getNodeParameter('filterBy', itemIndex, '') as string;
	
	let contacts;
	
	// Handle both string JSON and already parsed objects
	if (typeof contactsJson === 'string') {
		try {
			contacts = JSON.parse(contactsJson);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Invalid JSON';
			throw new Error('Invalid JSON in Contacts field: ' + errorMessage);
		}
	} else if (typeof contactsJson === 'object') {
		contacts = contactsJson;
	} else {
		throw new Error('Contacts must be a JSON string or array');
	}

	// If it's a single object, wrap it in an array
	if (!Array.isArray(contacts)) {
		if (typeof contacts === 'object' && contacts !== null) {
			contacts = [contacts];
		} else {
			throw new Error('Contacts must be an array or object');
		}
	}

	if (contacts.length > 100) {
		throw new Error('Maximum 100 contacts allowed per request');
	}

	// Ensure each contact has required fields
	const validatedContacts = contacts.map((contact: any, index: number) => {
		if (!contact.contactId) {
			contact.contactId = String(index + 1);
		}
		return contact;
	});

	const requestBody: IDataObject = {
		contacts: validatedContacts
	};

	// Add metadata if filtering is requested
	if (filterBy === 'emails') {
		requestBody.metadata = {
			revealEmails: true,
			revealPhones: false
		};
	} else if (filterBy === 'phones') {
		requestBody.metadata = {
			revealEmails: false,
			revealPhones: true
		};
	}

	const options: IHttpRequestOptions = {
		method: 'POST',
		url: 'https://api.lusha.com/v2/person',
		body: requestBody,
		headers: {
			'api_key': credentials.apiKey as string,
			'Content-Type': 'application/json',
			'Accept': 'application/json',
		},
		json: true,
	};

	return await this.helpers.httpRequest(options);
}

// Single company enrichment
async function enrichCompany(this: IExecuteFunctions, credentials: any, itemIndex: number): Promise<any> {
	const params: IDataObject = {};
	const searchBy = this.getNodeParameter('companySearchBy', itemIndex, 'domain') as string;
	
	if (searchBy === 'domain') {
		const domain = this.getNodeParameter('domain', itemIndex, '') as string;
		if (domain) params.domain = domain;
	} else if (searchBy === 'name') {
		const company = this.getNodeParameter('company', itemIndex, '') as string;
		if (company) params.company = company;
	}

	const options: IHttpRequestOptions = {
		method: 'GET',
		url: 'https://api.lusha.com/company',
		qs: params,
		headers: {
			'api_key': credentials.apiKey as string,
			'Content-Type': 'application/json',
			'Accept': 'application/json',
		},
		json: true,
	};

	return await this.helpers.httpRequest(options);
}

// Bulk company enrichment
async function enrichCompaniesBulk(this: IExecuteFunctions, credentials: any, itemIndex: number): Promise<any> {
	const companiesJson = this.getNodeParameter('companiesJson', itemIndex) as string | object;
	
	let companies;
	
	// Handle both string JSON and already parsed objects
	if (typeof companiesJson === 'string') {
		try {
			companies = JSON.parse(companiesJson);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Invalid JSON';
			throw new Error('Invalid JSON in Companies field: ' + errorMessage);
		}
	} else if (typeof companiesJson === 'object') {
		companies = companiesJson;
	} else {
		throw new Error('Companies must be a JSON string or array');
	}

	// If it's a single object, wrap it in an array
	if (!Array.isArray(companies)) {
		if (typeof companies === 'object' && companies !== null) {
			companies = [companies];
		} else {
			throw new Error('Companies must be an array or object');
		}
	}

	if (companies.length > 100) {
		throw new Error('Maximum 100 companies allowed per request');
	}

	const requestBody: IDataObject = {
		companies: companies
	};

	const options: IHttpRequestOptions = {
		method: 'POST',
		url: 'https://api.lusha.com/bulk/company',
		body: requestBody,
		headers: {
			'api_key': credentials.apiKey as string,
			'Content-Type': 'application/json',
			'Accept': 'application/json',
		},
		json: true,
	};

	return await this.helpers.httpRequest(options);
}

// Prospecting: Search contacts with user-friendly filters
async function searchContacts(this: IExecuteFunctions, credentials: any, itemIndex: number): Promise<any> {
	const page = this.getNodeParameter('page', itemIndex, 0) as number;
	const size = this.getNodeParameter('size', itemIndex, 40) as number;
	const contactFilters = this.getNodeParameter('contactFilters', itemIndex, {}) as IDataObject;
	const companyFilters = this.getNodeParameter('companyFilters', itemIndex, {}) as IDataObject;

	// Build the filters object
	const filters: IDataObject = {};

	// Process contact filters
	if (Object.keys(contactFilters).length > 0) {
		filters.contacts = { include: {} } as IDataObject;
		const contactsObj = filters.contacts as IDataObject;
		const include = contactsObj.include as IDataObject;

		if (contactFilters.jobTitles) {
			const titles = (contactFilters.jobTitles as string).split(',').map(t => t.trim()).filter(t => t);
			if (titles.length) include.jobTitles = titles;
		}

		if (contactFilters.departments && (contactFilters.departments as string[]).length) {
			include.departments = contactFilters.departments;
		}

		if (contactFilters.seniority && (contactFilters.seniority as number[]).length) {
			include.seniority = contactFilters.seniority;
		}

		if (contactFilters.existingDataPoints && (contactFilters.existingDataPoints as string[]).length) {
			include.existing_data_points = contactFilters.existingDataPoints;
		}

		// Handle locations
		const locations: IDataObject[] = [];
		if (contactFilters.countries && (contactFilters.countries as string[]).length) {
			(contactFilters.countries as string[]).forEach(country => {
				locations.push({ country });
			});
		}
		if (contactFilters.states) {
			const states = (contactFilters.states as string).split(',').map(s => s.trim()).filter(s => s);
			states.forEach(state => {
				locations.push({ state });
			});
		}
		if (contactFilters.cities) {
			const cities = (contactFilters.cities as string).split(',').map(c => c.trim()).filter(c => c);
			cities.forEach(city => {
				locations.push({ city });
			});
		}
		if (locations.length) {
			include.locations = locations;
		}
	}

	// Process company filters
	if (Object.keys(companyFilters).length > 0) {
		filters.companies = { include: {} } as IDataObject;
		const companiesObj = filters.companies as IDataObject;
		const include = companiesObj.include as IDataObject;

		if (companyFilters.names) {
			const names = (companyFilters.names as string).split(',').map(n => n.trim()).filter(n => n);
			if (names.length) include.names = names;
		}

		if (companyFilters.domains) {
			const domains = (companyFilters.domains as string).split(',').map(d => d.trim()).filter(d => d);
			if (domains.length) include.domains = domains;
		}

		if (companyFilters.employeeCountRanges && (companyFilters.employeeCountRanges as string[]).length) {
			include.sizes = (companyFilters.employeeCountRanges as string[]).map(range => {
				const parts = range.split('-');
				if (parts.length === 1 && parts[0].includes('+')) {
					return {
						min: parseInt(parts[0].replace('+', '')),
						max: 999999
					};
				}
				return {
					min: parseInt(parts[0]),
					max: parseInt(parts[1])
				};
			});
		}

		if (companyFilters.industries && (companyFilters.industries as number[]).length) {
			include.mainIndustriesIds = companyFilters.industries;
		}

		if (companyFilters.subIndustries && (companyFilters.subIndustries as number[]).length) {
			include.subIndustriesIds = companyFilters.subIndustries;
		}

		const revenueMin = companyFilters.revenueMin as number;
		const revenueMax = companyFilters.revenueMax as number;
		if (revenueMin > 0 || revenueMax > 0) {
			const revenues: IDataObject[] = [];
			revenues.push({
				min: revenueMin || 1,
				max: revenueMax || 999999999999
			});
			include.revenues = revenues;
		}

		// Company locations
		if (companyFilters.companyCountries && (companyFilters.companyCountries as string[]).length) {
			const locations: IDataObject[] = [];
			(companyFilters.companyCountries as string[]).forEach(country => {
				locations.push({ country });
			});
			include.locations = locations;
		}

		if (companyFilters.sicCodes) {
			const codes = (companyFilters.sicCodes as string).split(',').map(c => c.trim()).filter(c => c);
			if (codes.length) include.sics = codes;
		}

		if (companyFilters.naicsCodes) {
			const codes = (companyFilters.naicsCodes as string).split(',').map(c => c.trim()).filter(c => c);
			if (codes.length) include.naics = codes;
		}

		if (companyFilters.technologies) {
			const techs = (companyFilters.technologies as string).split(',').map(t => t.trim()).filter(t => t);
			if (techs.length) include.technologies = techs;
		}

		if (companyFilters.intentTopics) {
			const topics = (companyFilters.intentTopics as string).split(',').map(t => t.trim()).filter(t => t);
			if (topics.length) include.intentTopics = topics;
		}
	}

	const requestBody: IDataObject = {
		pages: {
			page,
			size
		},
		filters
	};

	const options: IHttpRequestOptions = {
		method: 'POST',
		url: 'https://api.lusha.com/prospecting/contact/search',
		body: requestBody,
		headers: {
			'api_key': credentials.apiKey as string,
			'Content-Type': 'application/json',
			'Accept': 'application/json',
		},
		json: true,
	};

	const response = await this.helpers.httpRequest(options);

	// Add helpful fields
	if (response && response.data) {
		const totalResults = response.totalResults || 0;
		const pageSize = response.pageLength || size;
		const totalPages = Math.ceil(totalResults / pageSize);
		const currentPage = response.currentPage || page;

		response.totalPages = totalPages;
		response.isFirstPage = currentPage === 0;
		response.isLastPage = currentPage >= totalPages - 1;
		
		// Extract contact IDs for easy use
		response.allContactIds = response.data.map((c: any) => c.contactId);
		response.visibleContactIds = response.data.filter((c: any) => c.isShown).map((c: any) => c.contactId);
		response.newContactIds = response.data.filter((c: any) => !c.isShown).map((c: any) => c.contactId);
	}

	return response;
}

// Prospecting: Enrich contacts with selection options
async function enrichProspectingContacts(this: IExecuteFunctions, credentials: any, itemIndex: number): Promise<any> {
	const requestId = this.getNodeParameter('requestId', itemIndex) as string;
	const selectionType = this.getNodeParameter('selectionType', itemIndex, 'custom') as string;
	
	let contactIds: string[] = [];

	// Get contact IDs based on selection type
	if (selectionType === 'custom') {
		const contactIdsString = this.getNodeParameter('contactIds', itemIndex, '') as string;
		contactIds = contactIdsString.split(',').map(id => id.trim()).filter(id => id);
	} else {
		// Get the input data from previous node (search results)
		const inputData = this.getInputData()[itemIndex];
		
		if (inputData && inputData.json) {
			const searchResults = inputData.json as any;
			
			if (selectionType === 'all' && searchResults.allContactIds) {
				contactIds = searchResults.allContactIds;
			} else if (selectionType === 'new' && searchResults.newContactIds) {
				contactIds = searchResults.newContactIds;
			} else if (selectionType === 'revealed' && searchResults.visibleContactIds) {
				contactIds = searchResults.visibleContactIds;
			}
		}
	}

	if (!requestId) {
		throw new Error('Request ID is required');
	}

	if (!contactIds.length) {
		throw new Error('No contact IDs found for enrichment');
	}

	const requestBody: IDataObject = {
		requestId,
		contactIds
	};

	const options: IHttpRequestOptions = {
		method: 'POST',
		url: 'https://api.lusha.com/prospecting/contact/enrich',
		body: requestBody,
		headers: {
			'api_key': credentials.apiKey as string,
			'Content-Type': 'application/json',
			'Accept': 'application/json',
		},
		json: true,
	};

	return await this.helpers.httpRequest(options);
}

// Prospecting: Search companies
async function searchCompanies(this: IExecuteFunctions, credentials: any, itemIndex: number): Promise<any> {
	const page = this.getNodeParameter('page', itemIndex, 0) as number;
	const size = this.getNodeParameter('size', itemIndex, 40) as number;
	const companyFilters = this.getNodeParameter('companyFilters', itemIndex, {}) as IDataObject;

	// Build the filters object
	const filters: IDataObject = {};

	// Process company filters
	if (Object.keys(companyFilters).length > 0) {
		filters.companies = { include: {} } as IDataObject;
		const companiesObj = filters.companies as IDataObject;
		const include = companiesObj.include as IDataObject;

		if (companyFilters.names) {
			const names = (companyFilters.names as string).split(',').map(n => n.trim()).filter(n => n);
			if (names.length) include.names = names;
		}

		if (companyFilters.domains) {
			const domains = (companyFilters.domains as string).split(',').map(d => d.trim()).filter(d => d);
			if (domains.length) include.domains = domains;
		}

		if (companyFilters.employeeCountRanges && (companyFilters.employeeCountRanges as string[]).length) {
			include.sizes = (companyFilters.employeeCountRanges as string[]).map(range => {
				const parts = range.split('-');
				if (parts.length === 1 && parts[0].includes('+')) {
					return {
						min: parseInt(parts[0].replace('+', '')),
						max: 999999
					};
				}
				return {
					min: parseInt(parts[0]),
					max: parseInt(parts[1])
				};
			});
		}

		if (companyFilters.industries && (companyFilters.industries as number[]).length) {
			include.mainIndustriesIds = companyFilters.industries;
		}

		if (companyFilters.subIndustries && (companyFilters.subIndustries as number[]).length) {
			include.subIndustriesIds = companyFilters.subIndustries;
		}

		const revenueMin = companyFilters.revenueMin as number;
		const revenueMax = companyFilters.revenueMax as number;
		if (revenueMin > 0 || revenueMax > 0) {
			const revenues: IDataObject[] = [];
			revenues.push({
				min: revenueMin || 1,
				max: revenueMax || 999999999999
			});
			include.revenues = revenues;
		}

		// Company locations
		if (companyFilters.companyCountries && (companyFilters.companyCountries as string[]).length) {
			const locations: IDataObject[] = [];
			(companyFilters.companyCountries as string[]).forEach(country => {
				locations.push({ country });
			});
			include.locations = locations;
		}

		if (companyFilters.sicCodes) {
			const codes = (companyFilters.sicCodes as string).split(',').map(c => c.trim()).filter(c => c);
			if (codes.length) include.sics = codes;
		}

		if (companyFilters.naicsCodes) {
			const codes = (companyFilters.naicsCodes as string).split(',').map(c => c.trim()).filter(c => c);
			if (codes.length) include.naics = codes;
		}

		if (companyFilters.technologies) {
			const techs = (companyFilters.technologies as string).split(',').map(t => t.trim()).filter(t => t);
			if (techs.length) include.technologies = techs;
		}

		if (companyFilters.intentTopics) {
			const topics = (companyFilters.intentTopics as string).split(',').map(t => t.trim()).filter(t => t);
			if (topics.length) include.intentTopics = topics;
		}
	}

	const requestBody: IDataObject = {
		pages: {
			page,
			size
		},
		filters
	};

	const options: IHttpRequestOptions = {
		method: 'POST',
		url: 'https://api.lusha.com/prospecting/company/search',
		body: requestBody,
		headers: {
			'api_key': credentials.apiKey as string,
			'Content-Type': 'application/json',
			'Accept': 'application/json',
		},
		json: true,
	};

	const response = await this.helpers.httpRequest(options);

	// Add helpful fields
	if (response && response.data) {
		const totalResults = response.totalResults || 0;
		const pageSize = response.pageLength || size;
		const totalPages = Math.ceil(totalResults / pageSize);
		const currentPage = response.currentPage || page;

		response.totalPages = totalPages;
		response.isFirstPage = currentPage === 0;
		response.isLastPage = currentPage >= totalPages - 1;
		
		// Extract company IDs for easy use
		if (Array.isArray(response.data) && response.data.length > 0) {
			response.allCompanyIds = response.data
				.map((c: any) => {
					// Company ID field is called "id"
					const id = c.id;
					if (!id) {
						console.warn('No ID found for company:', c);
					}
					return String(id);
				})
				.filter((id: string) => id && id !== 'undefined');
		} else {
			response.allCompanyIds = [];
		}
	}

	return response;
}

// Prospecting: Enrich companies
async function enrichProspectingCompanies(this: IExecuteFunctions, credentials: any, itemIndex: number): Promise<any> {
	const requestId = this.getNodeParameter('requestId', itemIndex) as string;
	const selectionType = this.getNodeParameter('companySelectionType', itemIndex, 'custom') as string;
	
	let companyIds: string[] = [];

	// Get company IDs based on selection type
	if (selectionType === 'custom') {
		const companyIdsString = this.getNodeParameter('companyIds', itemIndex, '') as string;
		// Split by comma and clean up each ID
		companyIds = companyIdsString
			.split(',')
			.map(id => id.trim())
			.filter(id => id && id.length > 0);
	} else if (selectionType === 'all') {
		// Get the input data from previous node (search results)
		const inputData = this.getInputData()[itemIndex];
		
		if (inputData && inputData.json) {
			const searchResults = inputData.json as any;
			
			if (searchResults.allCompanyIds && Array.isArray(searchResults.allCompanyIds)) {
				// Ensure each ID is a string and properly separated
				companyIds = searchResults.allCompanyIds.map((id: any) => String(id));
			}
		}
	}

	if (!requestId) {
		throw new Error('Request ID is required');
	}

	if (!companyIds.length) {
	throw new Error('No company IDs found for enrichment');
	}

	const requestBody: IDataObject = {
		requestId,
		companiesIds: companyIds
	};

	const options: IHttpRequestOptions = {
		method: 'POST',
		url: 'https://api.lusha.com/prospecting/company/enrich',
		body: requestBody,
		headers: {
			'api_key': credentials.apiKey as string,
			'Content-Type': 'application/json',
			'Accept': 'application/json',
		},
		json: true,
	};

	return await this.helpers.httpRequest(options);
}

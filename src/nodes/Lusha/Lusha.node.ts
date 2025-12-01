import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
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
		description: 'Lusha API integration for contact and company enrichment with prospecting',
		defaults: {
			name: 'Lusha',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'lushaApi',
				required: true,
			},
		],
		// Enable AI Agent usage
		usableAsTool: true,
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
				],
				default: 'contact',
				description: 'The resource to operate on',
			},

			// ===================== CONTACT OPERATIONS =====================
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
						value: 'enrichSingle',
						action: 'Enrich a single contact',
						description: 'Enrich a single contact with additional information',
					},
					{
						name: 'Enrich Bulk',
						value: 'enrichBulk',
						action: 'Enrich contacts in bulk',
						description: 'Enrich multiple contacts with additional information',
					},
					{
						name: 'Search Contacts',
						value: 'searchContacts',
						action: 'Search for contacts',
						description: 'Search and discover new contacts based on criteria',
					},
					{
						name: 'Enrich from Search',
						value: 'enrichFromSearch',
						action: 'Enrich contacts from search results',
						description: 'Enrich contacts found through a previous search',
					},
				],
				default: 'enrichSingle',
			},

			// ===== CONTACT ENRICH SINGLE FIELDS =====
			{
				displayName: 'Search By',
				name: 'searchBy',
				type: 'options',
				options: [
					{
						name: 'Name and Company',
						value: 'nameAndCompany',
					},
					{
						name: 'Email',
						value: 'email',
					},
					{
						name: 'LinkedIn URL',
						value: 'linkedinUrl',
					},
				],
				default: 'nameAndCompany',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrichSingle'],
					},
				},
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrichSingle'],
						searchBy: ['nameAndCompany'],
					},
				},
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrichSingle'],
						searchBy: ['nameAndCompany'],
					},
				},
			},
			{
				displayName: 'Company Name',
				name: 'companyName',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrichSingle'],
						searchBy: ['nameAndCompany'],
					},
				},
				description: 'Company name (e.g., Lusha)',
			},
			{
				displayName: 'Company Domain',
				name: 'companyDomain',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrichSingle'],
						searchBy: ['nameAndCompany'],
					},
				},
				description: 'Company domain (e.g., lusha.com)',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrichSingle'],
						searchBy: ['email'],
					},
				},
			},
			{
				displayName: 'LinkedIn URL',
				name: 'linkedinUrl',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrichSingle'],
						searchBy: ['linkedinUrl'],
					},
				},
			},
			{
				displayName: 'Filter By',
				name: 'filterBy',
				type: 'options',
				options: [
					{
						name: 'No Filter',
						value: '',
					},
					{
						name: 'Email Addresses',
						value: 'emailAddresses',
					},
					{
						name: 'Phone Numbers',
						value: 'phoneNumbers',
					},
				],
				default: '',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrichSingle'],
					},
				},
				description: 'Filter contacts based on the presence of email addresses or phone numbers',
			},
			{
				displayName: 'Reveal Emails',
				name: 'revealEmails',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrichSingle'],
					},
				},
				description: 'Set to true to retrieve email addresses of the contact',
			},
			{
				displayName: 'Reveal Phones',
				name: 'revealPhones',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrichSingle'],
					},
				},
				description: 'Set to true to retrieve phone numbers of the contact',
			},
			{
				displayName: 'Simplified Output',
				name: 'contactSimplifiedOutput',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrichSingle'],
					},
				},
				description:
					'If enabled, returns a flattened, friendly object plus the raw response under "raw". If disabled, returns the raw API response only.',
			},

			// ===== CONTACT SEARCH FIELDS =====
			{
				displayName: 'Job Titles',
				name: 'jobTitles',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['searchContacts'],
					},
				},
				description: 'Job titles to search for (comma-separated, e.g., CEO, CTO, Manager)',
				placeholder: 'CEO, CTO, Manager',
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
					{ name: 'Health Care & Medical', value: 'Health Care & Medical' },
					{ name: 'Human Resources', value: 'Human Resources' },
					{ name: 'Information Technology', value: 'Information Technology' },
					{ name: 'Legal', value: 'Legal' },
					{ name: 'Marketing', value: 'Marketing' },
					{ name: 'Operations', value: 'Operations' },
					{ name: 'Other', value: 'Other' },
					{ name: 'Product', value: 'Product' },
					{ name: 'Research & Analytics', value: 'Research & Analytics' },
					{ name: 'Sales', value: 'Sales' },
				],
				default: [],
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['searchContacts'],
					},
				},
			},
			{
				displayName: 'Seniorities',
				name: 'seniorities',
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
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['searchContacts'],
					},
				},
			},
			{
				displayName: 'Countries',
				name: 'countries',
				type: 'multiOptions',
				options: [
					{ name: 'United States', value: 'United States' },
					{ name: 'India', value: 'India' },
					{ name: 'United Kingdom', value: 'United Kingdom' },
					{ name: 'Brazil', value: 'Brazil' },
					{ name: 'Canada', value: 'Canada' },
					{ name: 'Australia', value: 'Australia' },
					{ name: 'France', value: 'France' },
					{ name: 'Germany', value: 'Germany' },
					{ name: 'Netherlands', value: 'Netherlands' },
					{ name: 'Italy', value: 'Italy' },
					{ name: 'South Africa', value: 'South Africa' },
					{ name: 'Mexico', value: 'Mexico' },
					{ name: 'Turkey', value: 'Turkey' },
					{ name: 'Sweden', value: 'Sweden' },
					{ name: 'China', value: 'China' },
					{ name: 'Indonesia', value: 'Indonesia' },
					{ name: 'Belgium', value: 'Belgium' },
					{ name: 'Spain', value: 'Spain' },
					{ name: 'United Arab Emirates', value: 'United Arab Emirates' },
					{ name: 'Argentina', value: 'Argentina' },
					{ name: 'Switzerland', value: 'Switzerland' },
					{ name: 'Singapore', value: 'Singapore' },
					{ name: 'Saudi Arabia', value: 'Saudi Arabia' },
					{ name: 'Ireland', value: 'Ireland' },
					{ name: 'Colombia', value: 'Colombia' },
					{ name: 'Chile', value: 'Chile' },
					{ name: 'Malaysia', value: 'Malaysia' },
					{ name: 'Egypt', value: 'Egypt' },
					{ name: 'Nigeria', value: 'Nigeria' },
					{ name: 'Japan', value: 'Japan' },
					{ name: 'Hong Kong', value: 'Hong Kong' },
					{ name: 'Finland', value: 'Finland' },
					{ name: 'Denmark', value: 'Denmark' },
					{ name: 'Taiwan', value: 'Taiwan' },
					{ name: 'Bangladesh', value: 'Bangladesh' },
					{ name: 'Austria', value: 'Austria' },
					{ name: 'Czech Republic', value: 'Czech Republic' },
					{ name: 'Peru', value: 'Peru' },
					{ name: 'Kenya', value: 'Kenya' },
					{ name: 'Vietnam', value: 'Vietnam' },
					{ name: 'Poland', value: 'Poland' },
					{ name: 'Ukraine', value: 'Ukraine' },
					{ name: 'Thailand', value: 'Thailand' },
					{ name: 'South Korea', value: 'South Korea' },
					{ name: 'Iran', value: 'Iran' },
					{ name: 'Morocco', value: 'Morocco' },
					{ name: 'Venezuela', value: 'Venezuela' },
					{ name: 'Hungary', value: 'Hungary' },
					{ name: 'Sri Lanka', value: 'Sri Lanka' },
					{ name: 'New Zealand', value: 'New Zealand' },
					{ name: 'Portugal', value: 'Portugal' },
				],
				default: [],
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['searchContacts'],
					},
				},
				description: 'Filter contacts by country',
			},
			{
				displayName: 'States',
				name: 'states',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['searchContacts'],
					},
				},
				description: 'States to search in (comma-separated)',
				placeholder: 'California, New York, Texas',
			},
			{
				displayName: 'Cities',
				name: 'cities',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['searchContacts'],
					},
				},
				description: 'Cities to search in (comma-separated)',
				placeholder: 'San Francisco, New York, London',
			},
			{
				displayName: 'Company Names / Domains',
				name: 'companyDomains',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['searchContacts'],
					},
				},
				description: 'Company names and/or domains (comma-separated, e.g., "Lusha, lusha.com")',
				placeholder: 'Lusha, lusha.com, Microsoft, microsoft.com',
			},
			{
				displayName: 'Existing Data Points',
				name: 'existingDataPoints',
				type: 'multiOptions',
				options: [
					{ name: 'Work Email', value: 'work_email' },
					{ name: 'Phone', value: 'phone' },
					{ name: 'Mobile Phone', value: 'mobile_phone' },
					{ name: 'Direct Phone', value: 'direct_phone' },
				],
				default: [],
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['searchContacts'],
					},
				},
				description: 'Filter contacts that have these data points',
			},
			
			// Company filters for contact search
			{
				displayName: 'Company Employee Count Min',
				name: 'contactSearchCompanyEmployeeMin',
				type: 'options',
				options: [
					{ name: 'No minimum', value: '' },
					{ name: '1', value: '1' },
					{ name: '11', value: '11' },
					{ name: '51', value: '51' },
					{ name: '201', value: '201' },
					{ name: '501', value: '501' },
					{ name: '1001', value: '1001' },
					{ name: '5001', value: '5001' },
					{ name: '10001', value: '10001' },
				],
				default: '',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['searchContacts'],
					},
				},
				description: 'Minimum company employee count',
			},
			{
				displayName: 'Company Employee Count Max',
				name: 'contactSearchCompanyEmployeeMax',
				type: 'options',
				options: [
					{ name: 'No maximum', value: '' },
					{ name: '10', value: '10' },
					{ name: '50', value: '50' },
					{ name: '200', value: '200' },
					{ name: '500', value: '500' },
					{ name: '1000', value: '1000' },
					{ name: '5000', value: '5000' },
					{ name: '10000', value: '10000' },
				],
				default: '',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['searchContacts'],
					},
				},
				description: 'Maximum company employee count',
			},
			{
				displayName: 'Company Revenue Min',
				name: 'contactSearchCompanyRevenueMin',
				type: 'options',
				options: [
					{ name: 'No minimum', value: '' },
					{ name: '$1', value: '1' },
					{ name: '$1M', value: '1000000' },
					{ name: '$5M', value: '5000000' },
					{ name: '$10M', value: '10000000' },
					{ name: '$50M', value: '50000000' },
					{ name: '$100M', value: '100000000' },
					{ name: '$250M', value: '250000000' },
					{ name: '$500M', value: '500000000' },
					{ name: '$1B', value: '1000000000' },
					{ name: '$10B', value: '10000000000' },
				],
				default: '',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['searchContacts'],
					},
				},
				description: 'Filter by minimum company revenue',
			},
			{
				displayName: 'Company Revenue Max',
				name: 'contactSearchCompanyRevenueMax',
				type: 'options',
				options: [
					{ name: 'No maximum', value: '' },
					{ name: '$1M', value: '1000000' },
					{ name: '$5M', value: '5000000' },
					{ name: '$10M', value: '10000000' },
					{ name: '$50M', value: '50000000' },
					{ name: '$100M', value: '100000000' },
					{ name: '$250M', value: '250000000' },
					{ name: '$500M', value: '500000000' },
					{ name: '$1B', value: '1000000000' },
					{ name: '$10B', value: '10000000000' },
				],
				default: '',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['searchContacts'],
					},
				},
				description: 'Filter by maximum company revenue',
			},
			{
				displayName: 'Company Main Industries',
				name: 'contactSearchCompanyMainIndustries',
				type: 'multiOptions',
				options: [
					{ name: 'Hospitality', value: '1' },
					{ name: 'Administrative & Support Services', value: '2' },
					{ name: 'Construction', value: '3' },
					{ name: 'Consumer Services', value: '4' },
					{ name: 'Organizations', value: '5' },
					{ name: 'Education', value: '6' },
					{ name: 'Entertainment', value: '7' },
					{ name: 'Farming, Ranching, Forestry', value: '8' },
					{ name: 'Finance', value: '9' },
					{ name: 'Government', value: '10' },
					{ name: 'Hospitals, Healthcare & Clinics', value: '11' },
					{ name: 'Manufacturing', value: '12' },
					{ name: 'Oil, Gas & Mining', value: '13' },
					{ name: 'Business Services', value: '14' },
					{ name: 'Real Estate', value: '15' },
					{ name: 'Retail', value: '16' },
					{ name: 'Technology, Information & Media', value: '17' },
					{ name: 'Transportation, Logistics, Supply Chain & Storage', value: '18' },
					{ name: 'Utilities', value: '19' },
					{ name: 'Wholesale', value: '20' },
				],
				default: [],
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['searchContacts'],
					},
				},
				description: 'Filter by company main industries',
			},
			{
				displayName: 'Company Sub-Industries',
				name: 'contactSearchCompanySubIndustries',
				type: 'multiOptions',
				options: [
					// Hospitality
					{ name: 'Restaurants', value: '2' },
					{ name: 'Food & Beverage Services', value: '1' },
					{ name: 'Hotels & Motels', value: '3' },
					// Administrative & Support Services
					{ name: 'Administrative & Support Services', value: '4' },
					{ name: 'Events Services', value: '5' },
					{ name: 'Facilities Services', value: '6' },
					{ name: 'Fundraising', value: '7' },
					{ name: 'Security & Investigations', value: '8' },
					{ name: 'Staffing & Recruiting', value: '9' },
					{ name: 'Translation & Localization', value: '10' },
					{ name: 'Travel Arrangements', value: '11' },
					{ name: 'Writing & Editing', value: '12' },
					// Construction
					{ name: 'Construction', value: '13' },
					{ name: 'Building Construction', value: '15' },
					{ name: 'Civil Engineering', value: '16' },
					// Consumer Services
					{ name: 'Personal Care Services', value: '17' },
					{ name: 'Philanthropic Fundraising Services', value: '18' },
					{ name: 'Repair & Maintenance', value: '19' },
					// Organizations
					{ name: 'Political Organizations', value: '20' },
					{ name: 'Civic & Social Organizations', value: '21' },
					{ name: 'Religious Institutions', value: '22' },
					// Education
					{ name: 'E-Learning Providers', value: '23' },
					{ name: 'Higher Education', value: '24' },
					{ name: 'Primary & Secondary Education', value: '25' },
					{ name: 'Training', value: '26' },
					{ name: 'Schools', value: '27' },
					// Entertainment
					{ name: 'Entertainment Providers', value: '28' },
					{ name: 'Museums, Historical Sites, & Zoos', value: '29' },
					{ name: 'Musicians, Artists & Writers', value: '30' },
					{ name: 'Performing Arts', value: '31' },
					{ name: 'Sports', value: '32' },
					{ name: 'Recreational Facilities', value: '33' },
					{ name: 'Gambling Facilities & Casinos', value: '34' },
					{ name: 'Wellness & Fitness Services', value: '35' },
					// Farming
					{ name: 'Farming, Ranching, Forestry', value: '36' },
					// Finance
					{ name: 'Financial Services', value: '37' },
					{ name: 'Capital Markets', value: '38' },
					{ name: 'Investment Banking', value: '39' },
					{ name: 'Investment Management', value: '40' },
					{ name: 'Venture Capital & Private Equity', value: '41' },
					{ name: 'Banking', value: '42' },
					{ name: 'International Trade & Development', value: '43' },
					{ name: 'Insurance', value: '44' },
					// Government
					{ name: 'Government Administration', value: '45' },
					{ name: 'Administration of Justice', value: '46' },
					{ name: 'Fire Protection', value: '47' },
					{ name: 'Law Enforcement', value: '48' },
					{ name: 'Public Safety', value: '49' },
					{ name: 'Education Administration Programs', value: '50' },
					{ name: 'Health & Human Services', value: '51' },
					{ name: 'Housing & Community Development', value: '52' },
					{ name: 'Military', value: '53' },
					{ name: 'International Affairs', value: '54' },
					{ name: 'Public Policy Offices', value: '55' },
					{ name: 'Executive Offices', value: '56' },
					{ name: 'Legislative Offices', value: '57' },
					{ name: 'Government Relations Services', value: '58' },
					// Healthcare
					{ name: 'Hospitals & Healthcare', value: '59' },
					{ name: 'Community Services', value: '60' },
					{ name: 'Individual & Family Services', value: '61' },
					{ name: 'Alternative Medicine', value: '62' },
					{ name: 'Home Health Care Services', value: '63' },
					{ name: 'Mental Health Care', value: '64' },
					{ name: 'Medical Practices', value: '65' },
					{ name: 'Nursing Homes & Residential Care', value: '66' },
					// Manufacturing
					{ name: 'Apparel', value: '67' },
					{ name: 'Appliances, Electrical, & Electronics', value: '68' },
					{ name: 'Chemicals & Related Products', value: '69' },
					{ name: 'Personal Care Products', value: '70' },
					{ name: 'Pharmaceuticals', value: '71' },
					{ name: 'Computer Equipment & Electronics', value: '72' },
					{ name: 'Computer Hardware', value: '73' },
					{ name: 'Semiconductor & Renewable Energy', value: '74' },
					{ name: 'Fabricated Metal Products', value: '75' },
					{ name: 'Food & Beverage', value: '76' },
					{ name: 'Furniture', value: '77' },
					{ name: 'Glass, Ceramics, Clay & Concrete', value: '78' },
					{ name: 'Industrial Machinery & Equipment', value: '79' },
					{ name: 'Medical Equipment', value: '80' },
					{ name: 'Paper & Forest Product', value: '81' },
					{ name: 'Plastics & Rubber Products', value: '82' },
					{ name: 'Sporting Goods', value: '83' },
					{ name: 'Textile', value: '84' },
					{ name: 'Tobacco', value: '85' },
					{ name: 'Aerospace & Defense', value: '86' },
					{ name: 'Motor Vehicles', value: '87' },
					{ name: 'Railroad Equipment', value: '88' },
					{ name: 'Shipbuilding', value: '89' },
					// Oil, Gas & Mining
					{ name: 'Mining', value: '90' },
					{ name: 'Oil & Gas', value: '91' },
					// Business Services
					{ name: 'Accounting & Services', value: '92' },
					{ name: 'Advertising & Marketing Services', value: '93' },
					{ name: 'Public Relations & Communications', value: '94' },
					{ name: 'Market Research Services', value: '95' },
					{ name: 'Architecture & Planning', value: '96' },
					{ name: 'Business Consulting & Services', value: '97' },
					{ name: 'Environmental Services', value: '98' },
					{ name: 'Human Resources Services', value: '99' },
					{ name: 'Outsourcing & Offshoring Consulting', value: '100' },
					{ name: 'Design Services', value: '101' },
					{ name: 'IT Consulting & IT Services', value: '103' },
					{ name: 'Law Firms & Legal Services', value: '104' },
					{ name: 'Photography Services', value: '105' },
					{ name: 'Biotechnology Research Services', value: '106' },
					{ name: 'Research Services', value: '107' },
					{ name: 'Veterinary Services', value: '108' },
					// Real Estate
					{ name: 'Real Estate', value: '109' },
					// Retail
					{ name: 'Retail Luxury Goods & Jewelry', value: '110' },
					{ name: 'Food & Beverage Retail', value: '111' },
					{ name: 'Grocery Retail', value: '112' },
					{ name: 'Retail Apparel & Fashion', value: '113' },
					{ name: 'Retail Office Equipment', value: '114' },
					{ name: 'Retail', value: '115' },
					// Technology, Information & Media
					{ name: 'Book & Newspaper Publishing', value: '116' },
					{ name: 'Broadcast Media Production & Distribution', value: '117' },
					{ name: 'Movies, Videos & Sound', value: '118' },
					{ name: 'Telecommunications', value: '119' },
					{ name: 'Data Infrastructure & Analytics', value: '120' },
					{ name: 'Blockchain Services', value: '121' },
					{ name: 'Information Services', value: '122' },
					{ name: 'Internet Publishing', value: '123' },
					{ name: 'Internet Shop & Marketplace', value: '124' },
					{ name: 'Social Networking Platforms', value: '125' },
					{ name: 'Computer & Mobile Games', value: '126' },
					{ name: 'Computer Networking Products', value: '127' },
					{ name: 'Computer & Network Security Services', value: '128' },
					{ name: 'Software Development', value: '129' },
					// Transportation
					{ name: 'Airlines, Airports & Air Services', value: '130' },
					{ name: 'Freight & Package Transportation', value: '131' },
					{ name: 'Ground Passenger Transportation', value: '132' },
					{ name: 'Maritime Transportation', value: '133' },
					{ name: 'Truck Transportation', value: '134' },
					{ name: 'Warehousing & Storage', value: '135' },
					// Utilities
					{ name: 'Utilities', value: '136' },
					// Wholesale
					{ name: 'Wholesale', value: '137' },
					{ name: 'Wholesale Building Materials', value: '138' },
					{ name: 'Wholesale Import & Export', value: '139' },
				],
				default: [],
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['searchContacts'],
					},
				},
				description: 'Filter by company sub-industries',
			},
			{
				displayName: 'Company Countries',
				name: 'contactSearchCompanyCountries',
				type: 'multiOptions',
				options: [
					{ name: 'United States', value: 'United States' },
					{ name: 'India', value: 'India' },
					{ name: 'United Kingdom', value: 'United Kingdom' },
					{ name: 'Brazil', value: 'Brazil' },
					{ name: 'Canada', value: 'Canada' },
					{ name: 'Australia', value: 'Australia' },
					{ name: 'France', value: 'France' },
					{ name: 'Germany', value: 'Germany' },
					{ name: 'Netherlands', value: 'Netherlands' },
					{ name: 'Italy', value: 'Italy' },
					{ name: 'South Africa', value: 'South Africa' },
					{ name: 'Mexico', value: 'Mexico' },
				],
				default: [],
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['searchContacts'],
					},
				},
				description: 'Filter contacts by company country',
			},
			{
				displayName: 'Company States',
				name: 'contactSearchCompanyStates',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['searchContacts'],
					},
				},
				description: 'Filter contacts by company states (comma-separated)',
				placeholder: 'California, New York',
			},
			{
				displayName: 'Company Cities',
				name: 'contactSearchCompanyCities',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['searchContacts'],
					},
				},
				description: 'Filter contacts by company cities (comma-separated)',
				placeholder: 'San Francisco, New York',
			},

			// ===== CONTACT ENRICH FROM SEARCH FIELDS =====
			{
				displayName: 'Request ID',
				name: 'requestId',
				type: 'string',
				default: '={{ $json.requestId }}',
				required: true,
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrichFromSearch'],
					},
				},
				description: 'The request ID from a previous search operation (auto-populated if connected to a search node)',
				hint: 'Connect this node to a Search Contacts node to auto-populate',
			},
			{
				displayName: 'Contact Selection',
				name: 'contactSelectionType',
				type: 'options',
				options: [
					{
						name: 'All Contacts',
						value: 'all',
						description: 'Enrich all contacts from the search',
					},
					{
						name: 'New Contacts Only',
						value: 'new',
						description: 'Enrich only new contacts (not previously revealed)',
					},
					{
						name: 'Specific Contact IDs',
						value: 'specific',
						description: 'Enrich specific contact IDs',
					},
				],
				default: 'all',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrichFromSearch'],
					},
				},
			},
			{
				displayName: 'Contact IDs',
				name: 'contactIds',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrichFromSearch'],
						contactSelectionType: ['specific'],
					},
				},
				description: 'Comma-separated list of contact IDs to enrich',
				placeholder: 'contact_123, contact_456',
			},

			// ===== CONTACT BULK ENRICH FIELDS =====
			{
				displayName: 'Bulk Type',
				name: 'bulkType',
				type: 'options',
				options: [
					{
						name: 'Simple List',
						value: 'simple',
						description: 'Use a simple list of contacts',
					},
					{
						name: 'Advanced JSON',
						value: 'json',
						description: 'Use raw JSON for advanced configurations',
					},
				],
				default: 'simple',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrichBulk'],
					},
				},
			},
			// Bulk metadata fields
			{
				displayName: 'Filter By',
				name: 'bulkFilterBy',
				type: 'options',
				options: [
					{
						name: 'No Filter',
						value: '',
					},
					{
						name: 'Email Addresses',
						value: 'emailAddresses',
					},
					{
						name: 'Phone Numbers',
						value: 'phoneNumbers',
					},
				],
				default: '',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrichBulk'],
						bulkType: ['simple'],
					},
				},
				description: 'Filter contacts based on the presence of email addresses or phone numbers',
			},
			{
				displayName: 'Reveal Emails',
				name: 'bulkRevealEmails',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrichBulk'],
						bulkType: ['simple'],
					},
				},
				description: 'Set to true to retrieve email addresses of contacts',
			},
			{
				displayName: 'Reveal Phones',
				name: 'bulkRevealPhones',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrichBulk'],
						bulkType: ['simple'],
					},
				},
				description: 'Set to true to retrieve phone numbers of contacts',
			},
			// Simple bulk fields
			{
				displayName: 'Contacts',
				name: 'contactsList',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrichBulk'],
						bulkType: ['simple'],
					},
				},
				description: 'List of contacts to enrich. Each contact needs at least one identifier: email, LinkedIn URL, or name + company',
				options: [
					{
						name: 'contact',
						displayName: 'Contact',
						values: [
							{
								displayName: 'Email',
								name: 'email',
								type: 'string',
								default: '',
								placeholder: 'john.doe@company.com',
								description: 'Primary identifier - use this OR LinkedIn URL OR Name+Company',
							},
							{
								displayName: 'LinkedIn URL',
								name: 'linkedinUrl',
								type: 'string',
								default: '',
								placeholder: 'https://linkedin.com/in/johndoe',
								description: 'Alternative identifier if email not available',
							},
							{
								displayName: 'Full Name',
								name: 'fullName',
								type: 'string',
								default: '',
								placeholder: 'John Doe',
								description: 'Full name of the contact (use with Company if no email/LinkedIn)',
							},
							{
								displayName: 'Company Name',
								name: 'companyName',
								type: 'string',
								default: '',
								placeholder: 'Acme Corp',
								description: 'Company name (use with First + Last name)',
							},
							{
								displayName: 'Company Domain',
								name: 'companyDomain',
								type: 'string',
								default: '',
								placeholder: 'acmecorp.com',
								description: 'Company domain (use with First + Last name)',
							},
						],
					},
				],
			},
			// Advanced JSON field
			{
				displayName: 'Contacts Payload (JSON)',
				name: 'contactsPayloadJson',
				type: 'string',
				typeOptions: {
					rows: 10,
				},
				default: '{\n  "contacts": [],\n  "metadata": {}\n}',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrichBulk'],
						bulkType: ['json'],
					},
				},
				description: 'Raw JSON body for POST /v2/person bulk enrichment (contacts + metadata).',
			},

			// ===================== COMPANY OPERATIONS =====================
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
						value: 'enrichSingle',
						action: 'Enrich a single company',
						description: 'Enrich a single company with additional information',
					},
					{
						name: 'Enrich Bulk',
						value: 'enrichBulk',
						action: 'Enrich companies in bulk',
						description: 'Enrich multiple companies with additional information',
					},
					{
						name: 'Search Companies',
						value: 'searchCompanies',
						action: 'Search for companies',
						description: 'Search and discover new companies based on criteria',
					},
					{
						name: 'Enrich from Search',
						value: 'enrichFromSearch',
						action: 'Enrich companies from search results',
						description: 'Enrich companies found through a previous search',
					},
				],
				default: 'enrichSingle',
			},

			// ===== COMPANY ENRICH SINGLE FIELDS =====
			{
				displayName: 'Search By',
				name: 'companySearchBy',
				type: 'options',
				options: [
					{
						name: 'Domain',
						value: 'domain',
					},
					{
						name: 'Company Name',
						value: 'name',
					},
				],
				default: 'domain',
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['enrichSingle'],
					},
				},
			},
			{
				displayName: 'Domain',
				name: 'domain',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['enrichSingle'],
						companySearchBy: ['domain'],
					},
				},
				description: 'Company domain (e.g., example.com)',
			},
			{
				displayName: 'Company Name',
				name: 'companyName',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['enrichSingle'],
						companySearchBy: ['name'],
					},
				},
			},
			{
				displayName: 'Simplified Output',
				name: 'companySimplifiedOutput',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['enrichSingle'],
					},
				},
				description:
					'If enabled, returns a flattened, friendly object plus the raw response under "raw". If disabled, returns the raw API response only.',
			},

			// ===== COMPANY SEARCH FIELDS =====
			{
				displayName: 'Company Names / Domains',
				name: 'searchCompanyDomains',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['searchCompanies'],
					},
				},
				description: 'Company names or domains to search (comma-separated, e.g., "Lusha, lusha.com")',
				placeholder: 'Lusha, lusha.com, Microsoft, microsoft.com',
			},
			{
				displayName: 'Company Countries',
				name: 'companyCountries',
				type: 'multiOptions',
				options: [
					{ name: 'United States', value: 'United States' },
					{ name: 'India', value: 'India' },
					{ name: 'United Kingdom', value: 'United Kingdom' },
					{ name: 'Brazil', value: 'Brazil' },
					{ name: 'Canada', value: 'Canada' },
					{ name: 'Australia', value: 'Australia' },
					{ name: 'France', value: 'France' },
					{ name: 'Germany', value: 'Germany' },
					{ name: 'Netherlands', value: 'Netherlands' },
					{ name: 'Italy', value: 'Italy' },
					{ name: 'South Africa', value: 'South Africa' },
					{ name: 'Mexico', value: 'Mexico' },
					{ name: 'Other Countries...', value: '' }, // Add more as needed
				],
				default: [],
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['searchCompanies'],
					},
				},
				description: 'Filter by company countries',
			},
			{
				displayName: 'Company States',
				name: 'companyStates',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['searchCompanies'],
					},
				},
				description: 'Filter by company states (comma-separated)',
				placeholder: 'California, New York, Texas',
			},
			{
				displayName: 'Company Cities',
				name: 'companyCities',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['searchCompanies'],
					},
				},
				description: 'Filter by company cities (comma-separated)',
				placeholder: 'San Francisco, New York, London',
			},
			{
				displayName: 'Employee Count Min',
				name: 'companyEmployeeMin',
				type: 'options',
				options: [
					{ name: 'No minimum', value: '' },
					{ name: '1', value: '1' },
					{ name: '11', value: '11' },
					{ name: '51', value: '51' },
					{ name: '201', value: '201' },
					{ name: '501', value: '501' },
					{ name: '1001', value: '1001' },
					{ name: '5001', value: '5001' },
					{ name: '10001', value: '10001' },
				],
				default: '',
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['searchCompanies'],
					},
				},
				description: 'Minimum company employee count',
			},
			{
				displayName: 'Employee Count Max',
				name: 'companyEmployeeMax',
				type: 'options',
				options: [
					{ name: 'No maximum', value: '' },
					{ name: '10', value: '10' },
					{ name: '50', value: '50' },
					{ name: '200', value: '200' },
					{ name: '500', value: '500' },
					{ name: '1000', value: '1000' },
					{ name: '5000', value: '5000' },
					{ name: '10000', value: '10000' },
				],
				default: '',
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['searchCompanies'],
					},
				},
				description: 'Maximum company employee count',
			},
			{
				displayName: 'Main Industry',
				name: 'companyMainIndustryIds',
				type: 'multiOptions',
				options: [
					{ name: 'Hospitality', value: '1' },
					{ name: 'Administrative & Support Services', value: '2' },
					{ name: 'Construction', value: '3' },
					{ name: 'Consumer Services', value: '4' },
					{ name: 'Organizations', value: '5' },
					{ name: 'Education', value: '6' },
					{ name: 'Entertainment', value: '7' },
					{ name: 'Farming, Ranching, Forestry', value: '8' },
					{ name: 'Finance', value: '9' },
					{ name: 'Government', value: '10' },
					{ name: 'Hospitals, Healthcare & Clinics', value: '11' },
					{ name: 'Manufacturing', value: '12' },
					{ name: 'Oil, Gas & Mining', value: '13' },
					{ name: 'Business Services', value: '14' },
					{ name: 'Real Estate', value: '15' },
					{ name: 'Retail', value: '16' },
					{ name: 'Technology, Information & Media', value: '17' },
					{ name: 'Transportation, Logistics, Supply Chain & Storage', value: '18' },
					{ name: 'Utilities', value: '19' },
					{ name: 'Wholesale', value: '20' },
				],
				default: [],
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['searchCompanies'],
					},
				},
				description: 'Filter by main industry',
			},
			{
				displayName: 'Sub-Industries',
				name: 'companySubIndustryIds',
				type: 'multiOptions',
				options: [
					// Hospitality
					{ name: 'Restaurants', value: '2' },
					{ name: 'Food & Beverage Services', value: '1' },
					{ name: 'Hotels & Motels', value: '3' },
					// Administrative & Support Services
					{ name: 'Administrative & Support Services', value: '4' },
					{ name: 'Events Services', value: '5' },
					{ name: 'Facilities Services', value: '6' },
					{ name: 'Fundraising', value: '7' },
					{ name: 'Security & Investigations', value: '8' },
					{ name: 'Staffing & Recruiting', value: '9' },
					{ name: 'Translation & Localization', value: '10' },
					{ name: 'Travel Arrangements', value: '11' },
					{ name: 'Writing & Editing', value: '12' },
					// Construction
					{ name: 'Construction', value: '13' },
					{ name: 'Building Construction', value: '15' },
					{ name: 'Civil Engineering', value: '16' },
					// Consumer Services
					{ name: 'Personal Care Services', value: '17' },
					{ name: 'Philanthropic Fundraising Services', value: '18' },
					{ name: 'Repair & Maintenance', value: '19' },
					// Organizations
					{ name: 'Political Organizations', value: '20' },
					{ name: 'Civic & Social Organizations', value: '21' },
					{ name: 'Religious Institutions', value: '22' },
					// Education
					{ name: 'E-Learning Providers', value: '23' },
					{ name: 'Higher Education', value: '24' },
					{ name: 'Primary & Secondary Education', value: '25' },
					{ name: 'Training', value: '26' },
					{ name: 'Schools', value: '27' },
					// Entertainment
					{ name: 'Entertainment Providers', value: '28' },
					{ name: 'Museums, Historical Sites, & Zoos', value: '29' },
					{ name: 'Musicians, Artists & Writers', value: '30' },
					{ name: 'Performing Arts', value: '31' },
					{ name: 'Sports', value: '32' },
					{ name: 'Recreational Facilities', value: '33' },
					{ name: 'Gambling Facilities & Casinos', value: '34' },
					{ name: 'Wellness & Fitness Services', value: '35' },
					// Farming
					{ name: 'Farming, Ranching, Forestry', value: '36' },
					// Finance
					{ name: 'Financial Services', value: '37' },
					{ name: 'Capital Markets', value: '38' },
					{ name: 'Investment Banking', value: '39' },
					{ name: 'Investment Management', value: '40' },
					{ name: 'Venture Capital & Private Equity', value: '41' },
					{ name: 'Banking', value: '42' },
					{ name: 'International Trade & Development', value: '43' },
					{ name: 'Insurance', value: '44' },
					// Government
					{ name: 'Government Administration', value: '45' },
					{ name: 'Administration of Justice', value: '46' },
					{ name: 'Fire Protection', value: '47' },
					{ name: 'Law Enforcement', value: '48' },
					{ name: 'Public Safety', value: '49' },
					{ name: 'Education Administration Programs', value: '50' },
					{ name: 'Health & Human Services', value: '51' },
					{ name: 'Housing & Community Development', value: '52' },
					{ name: 'Military', value: '53' },
					{ name: 'International Affairs', value: '54' },
					{ name: 'Public Policy Offices', value: '55' },
					{ name: 'Executive Offices', value: '56' },
					{ name: 'Legislative Offices', value: '57' },
					{ name: 'Government Relations Services', value: '58' },
					// Healthcare
					{ name: 'Hospitals & Healthcare', value: '59' },
					{ name: 'Community Services', value: '60' },
					{ name: 'Individual & Family Services', value: '61' },
					{ name: 'Alternative Medicine', value: '62' },
					{ name: 'Home Health Care Services', value: '63' },
					{ name: 'Mental Health Care', value: '64' },
					{ name: 'Medical Practices', value: '65' },
					{ name: 'Nursing Homes & Residential Care', value: '66' },
					// Manufacturing
					{ name: 'Apparel', value: '67' },
					{ name: 'Appliances, Electrical, & Electronics', value: '68' },
					{ name: 'Chemicals & Related Products', value: '69' },
					{ name: 'Personal Care Products', value: '70' },
					{ name: 'Pharmaceuticals', value: '71' },
					{ name: 'Computer Equipment & Electronics', value: '72' },
					{ name: 'Computer Hardware', value: '73' },
					{ name: 'Semiconductor & Renewable Energy', value: '74' },
					{ name: 'Fabricated Metal Products', value: '75' },
					{ name: 'Food & Beverage', value: '76' },
					{ name: 'Furniture', value: '77' },
					{ name: 'Glass, Ceramics, Clay & Concrete', value: '78' },
					{ name: 'Industrial Machinery & Equipment', value: '79' },
					{ name: 'Medical Equipment', value: '80' },
					{ name: 'Paper & Forest Product', value: '81' },
					{ name: 'Plastics & Rubber Products', value: '82' },
					{ name: 'Sporting Goods', value: '83' },
					{ name: 'Textile', value: '84' },
					{ name: 'Tobacco', value: '85' },
					{ name: 'Aerospace & Defense', value: '86' },
					{ name: 'Motor Vehicles', value: '87' },
					{ name: 'Railroad Equipment', value: '88' },
					{ name: 'Shipbuilding', value: '89' },
					// Oil, Gas & Mining
					{ name: 'Mining', value: '90' },
					{ name: 'Oil & Gas', value: '91' },
					// Business Services
					{ name: 'Accounting & Services', value: '92' },
					{ name: 'Advertising & Marketing Services', value: '93' },
					{ name: 'Public Relations & Communications', value: '94' },
					{ name: 'Market Research Services', value: '95' },
					{ name: 'Architecture & Planning', value: '96' },
					{ name: 'Business Consulting & Services', value: '97' },
					{ name: 'Environmental Services', value: '98' },
					{ name: 'Human Resources Services', value: '99' },
					{ name: 'Outsourcing & Offshoring Consulting', value: '100' },
					{ name: 'Design Services', value: '101' },
					{ name: 'IT Consulting & IT Services', value: '103' },
					{ name: 'Law Firms & Legal Services', value: '104' },
					{ name: 'Photography Services', value: '105' },
					{ name: 'Biotechnology Research Services', value: '106' },
					{ name: 'Research Services', value: '107' },
					{ name: 'Veterinary Services', value: '108' },
					// Real Estate
					{ name: 'Real Estate', value: '109' },
					// Retail
					{ name: 'Retail Luxury Goods & Jewelry', value: '110' },
					{ name: 'Food & Beverage Retail', value: '111' },
					{ name: 'Grocery Retail', value: '112' },
					{ name: 'Retail Apparel & Fashion', value: '113' },
					{ name: 'Retail Office Equipment', value: '114' },
					{ name: 'Retail', value: '115' },
					// Technology, Information & Media
					{ name: 'Book & Newspaper Publishing', value: '116' },
					{ name: 'Broadcast Media Production & Distribution', value: '117' },
					{ name: 'Movies, Videos & Sound', value: '118' },
					{ name: 'Telecommunications', value: '119' },
					{ name: 'Data Infrastructure & Analytics', value: '120' },
					{ name: 'Blockchain Services', value: '121' },
					{ name: 'Information Services', value: '122' },
					{ name: 'Internet Publishing', value: '123' },
					{ name: 'Internet Shop & Marketplace', value: '124' },
					{ name: 'Social Networking Platforms', value: '125' },
					{ name: 'Computer & Mobile Games', value: '126' },
					{ name: 'Computer Networking Products', value: '127' },
					{ name: 'Computer & Network Security Services', value: '128' },
					{ name: 'Software Development', value: '129' },
					// Transportation
					{ name: 'Airlines, Airports & Air Services', value: '130' },
					{ name: 'Freight & Package Transportation', value: '131' },
					{ name: 'Ground Passenger Transportation', value: '132' },
					{ name: 'Maritime Transportation', value: '133' },
					{ name: 'Truck Transportation', value: '134' },
					{ name: 'Warehousing & Storage', value: '135' },
					// Utilities
					{ name: 'Utilities', value: '136' },
					// Wholesale
					{ name: 'Wholesale', value: '137' },
					{ name: 'Wholesale Building Materials', value: '138' },
					{ name: 'Wholesale Import & Export', value: '139' },
				],
				default: [],
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['searchCompanies'],
					},
				},
				description: 'Filter by sub-industries',
			},
			{
				displayName: 'Revenue Minimum',
				name: 'companyRevenueMin',
				type: 'options',
				options: [
					{ name: 'No minimum', value: '' },
					{ name: '$1', value: '1' },
					{ name: '$1M', value: '1000000' },
					{ name: '$5M', value: '5000000' },
					{ name: '$10M', value: '10000000' },
					{ name: '$50M', value: '50000000' },
					{ name: '$100M', value: '100000000' },
					{ name: '$250M', value: '250000000' },
					{ name: '$500M', value: '500000000' },
					{ name: '$1B', value: '1000000000' },
					{ name: '$10B', value: '10000000000' },
					{ name: '$100B', value: '100000000000' },
				],
				default: '',
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['searchCompanies'],
					},
				},
				description: 'Minimum annual revenue in USD',
			},
			{
				displayName: 'Revenue Maximum',
				name: 'companyRevenueMax',
				type: 'options',
				options: [
					{ name: 'No maximum', value: '' },
					{ name: '$1M', value: '1000000' },
					{ name: '$5M', value: '5000000' },
					{ name: '$10M', value: '10000000' },
					{ name: '$50M', value: '50000000' },
					{ name: '$100M', value: '100000000' },
					{ name: '$250M', value: '250000000' },
					{ name: '$500M', value: '500000000' },
					{ name: '$1B', value: '1000000000' },
					{ name: '$10B', value: '10000000000' },
					{ name: '$100B', value: '100000000000' },
				],
				default: '',
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['searchCompanies'],
					},
				},
				description: 'Maximum annual revenue in USD',
			},

			// ===== COMPANY ENRICH FROM SEARCH FIELDS =====
			{
				displayName: 'Request ID',
				name: 'companyRequestId',
				type: 'string',
				default: '={{ $json.requestId }}',
				required: true,
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['enrichFromSearch'],
					},
				},
				description: 'The request ID from a previous company search operation (auto-populated if connected to a search node)',
				hint: 'Connect this node to a Search Companies node to auto-populate',
			},
			{
				displayName: 'Company Selection',
				name: 'companySelectionType',
				type: 'options',
				options: [
					{
						name: 'All Companies',
						value: 'all',
						description: 'Enrich all companies from the search',
					},
					{
						name: 'Specific Company IDs',
						value: 'specific',
						description: 'Enrich specific company IDs',
					},
				],
				default: 'all',
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['enrichFromSearch'],
					},
				},
			},
			{
				displayName: 'Company IDs',
				name: 'companyIds',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['enrichFromSearch'],
						companySelectionType: ['specific'],
					},
				},
				description: 'Comma-separated list of company IDs to enrich',
				placeholder: 'company_123, company_456',
			},

			// ===== COMPANY BULK ENRICH FIELDS =====
			{
				displayName: 'Bulk Type',
				name: 'companyBulkType',
				type: 'options',
				options: [
					{
						name: 'Simple List',
						value: 'simple',
						description: 'Use a simple list of companies',
					},
					{
						name: 'Advanced JSON',
						value: 'json',
						description: 'Use raw JSON for advanced configurations',
					},
				],
				default: 'simple',
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['enrichBulk'],
					},
				},
			},
			// Simple bulk fields for companies
			{
				displayName: 'Companies',
				name: 'companiesList',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['enrichBulk'],
						companyBulkType: ['simple'],
					},
				},
				description: 'List of companies to enrich',
				options: [
					{
						name: 'company',
						displayName: 'Company',
						values: [
							{
								displayName: 'Company Name',
								name: 'name',
								type: 'string',
								default: '',
								placeholder: 'Google',
								description: 'Company name',
							},
							{
								displayName: 'Domain',
								name: 'domain',
								type: 'string',
								default: '',
								placeholder: 'google.com',
								description: 'Company domain (optional if name is provided)',
							},
						],
					},
				],
			},
			// Advanced JSON field for companies
			{
				displayName: 'Companies Payload (JSON)',
				name: 'companiesPayloadJson',
				type: 'string',
				typeOptions: {
					rows: 10,
				},
				default: '{\n  "companies": []\n}',
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['enrichBulk'],
						companyBulkType: ['json'],
					},
				},
				description: 'Raw JSON body for POST /v2/company bulk enrichment (companies + optional signals).',
			},

			// ===== PAGINATION FIELDS (CONTACT & COMPANY SEARCH) =====
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				default: 0,
				displayOptions: {
					show: {
						resource: ['contact', 'company'],
						operation: ['searchContacts', 'searchCompanies'],
					},
				},
				description: 'Page number for pagination (starts at 0)',
			},
			{
				displayName: 'Page Size',
				name: 'pageSize',
				type: 'number',
				default: 50,
				displayOptions: {
					show: {
						resource: ['contact', 'company'],
						operation: ['searchContacts', 'searchCompanies'],
					},
				},
				description: 'Number of results per page (max 50)',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let requestOptions: IHttpRequestOptions = {
					baseURL: 'https://api.lusha.com',
					url: '',
					method: 'GET',
					headers: {
						Accept: 'application/json',
					},
					qs: {},
					body: {},
					json: true,
					returnFullResponse: false,
				};

				// ===================== CONTACT OPERATIONS =====================
				if (resource === 'contact') {
					switch (operation) {
						case 'enrichSingle': {
							const searchBy = this.getNodeParameter('searchBy', i) as string;

							requestOptions.url = '/v2/person';
							requestOptions.method = 'GET';
							delete requestOptions.body; // Remove body for GET request
							requestOptions.qs = {};

							if (searchBy === 'nameAndCompany') {
								const firstName = this.getNodeParameter('firstName', i, '') as string;
								const lastName = this.getNodeParameter('lastName', i, '') as string;
								const companyName = this.getNodeParameter('companyName', i, '') as string;
								const companyDomain = this.getNodeParameter('companyDomain', i, '') as string;

								if (firstName) requestOptions.qs.firstName = firstName;
								if (lastName) requestOptions.qs.lastName = lastName;
								
								// Include both company name and domain if provided
								if (companyName) requestOptions.qs.companyName = companyName;
								if (companyDomain) requestOptions.qs.companyDomain = companyDomain;
							} else if (searchBy === 'email') {
								const email = this.getNodeParameter('email', i) as string;
								requestOptions.qs.email = email;
							} else if (searchBy === 'linkedinUrl') {
								const linkedinUrl = this.getNodeParameter('linkedinUrl', i) as string;
								requestOptions.qs.linkedinUrl = linkedinUrl;
							}
							
							// Add filterBy if specified
							const filterBy = this.getNodeParameter('filterBy', i, '') as string;
							if (filterBy) {
								requestOptions.qs.filterBy = filterBy;
							}
							
							// Add reveal options only if true
							const revealEmails = this.getNodeParameter('revealEmails', i, false) as boolean;
							const revealPhones = this.getNodeParameter('revealPhones', i, false) as boolean;
							if (revealEmails) requestOptions.qs.revealEmails = true;
							if (revealPhones) requestOptions.qs.revealPhones = true;
							
							break;
						}

						case 'searchContacts': {
							requestOptions.url = '/prospecting/contact/search';
							requestOptions.method = 'POST';
							if (!requestOptions.headers) requestOptions.headers = {};
							requestOptions.headers['Content-Type'] = 'application/json';
							delete requestOptions.qs; // Remove query string for POST

							// Build proper request body structure
							const contactSearchBody: IDataObject = {
								pages: {
									page: this.getNodeParameter('page', i, 0) as number,
									size: Math.min(this.getNodeParameter('pageSize', i, 50) as number, 50),
								},
								filters: {
									contacts: { include: {} },
									companies: { include: {} },
								},
							};

							// Add job titles
							const jobTitles = this.getNodeParameter('jobTitles', i, '') as string;
							if (jobTitles) {
								(contactSearchBody.filters as IDataObject).contacts = {
									include: {
										jobTitles: jobTitles
											.split(',')
											.map((t) => t.trim())
											.filter((t) => t),
									},
								};
							}

							// Add departments
							const departments = this.getNodeParameter('departments', i, []) as string[];
							if (departments.length) {
								const contactInclude = ((contactSearchBody.filters as IDataObject)
									.contacts as IDataObject).include as IDataObject;
								contactInclude.departments = departments;
							}

							// Add seniorities (as numbers)
							const seniorities = this.getNodeParameter('seniorities', i, []) as number[];
							if (seniorities.length) {
								const contactInclude = ((contactSearchBody.filters as IDataObject)
									.contacts as IDataObject).include as IDataObject;
								contactInclude.seniority = seniorities;
							}

							// Add locations
							const countries = this.getNodeParameter('countries', i, []) as string[];
							const states = this.getNodeParameter('states', i, '') as string;
							const cities = this.getNodeParameter('cities', i, '') as string;
							const locations: IDataObject[] = [];

							if (countries.length) {
								countries.forEach((country) => {
									locations.push({ country });
								});
							}
							if (states) {
								states
									.split(',')
									.map((s) => s.trim())
									.filter((s) => s)
									.forEach((state) => {
										locations.push({ state });
									});
							}
							if (cities) {
								cities
									.split(',')
									.map((c) => c.trim())
									.filter((c) => c)
									.forEach((city) => {
										locations.push({ city });
									});
							}

							if (locations.length) {
								const contactInclude = ((contactSearchBody.filters as IDataObject)
									.contacts as IDataObject).include as IDataObject;
								contactInclude.locations = locations;
							}

							// Add existing data points
							const existingDataPoints = this.getNodeParameter(
								'existingDataPoints',
								i,
								[],
							) as string[];
							if (existingDataPoints.length) {
								const contactInclude = ((contactSearchBody.filters as IDataObject)
									.contacts as IDataObject).include as IDataObject;
								contactInclude.existingDataPoints = existingDataPoints;
							}

							// Add company filters (names/domains)
							const companyDomains = this.getNodeParameter(
								'companyDomains',
								i,
								'',
							) as string;
							if (companyDomains) {
								const companiesInclude = ((contactSearchBody.filters as IDataObject)
									.companies as IDataObject).include as IDataObject;
								const companyList = companyDomains
									.split(',')
									.map((c) => c.trim())
									.filter((c) => c);

								// Separate names and domains
								const domains = companyList.filter((c) => c.includes('.'));
								const names = companyList.filter((c) => !c.includes('.'));

								if (domains.length) companiesInclude.domains = domains;
								if (names.length) companiesInclude.names = names;
							}
							
							// Add company industry filters
							const companyIndustries = this.getNodeParameter(
								'contactSearchCompanyMainIndustries',
								i,
								[],
							) as string[];
							if (companyIndustries.length) {
								const companiesInclude = ((contactSearchBody.filters as IDataObject)
									.companies as IDataObject).include as IDataObject;
								companiesInclude.mainIndustriesIds = companyIndustries;
							}
							
							// Add company sub-industry filters
							const companySubIndustries = this.getNodeParameter(
								'contactSearchCompanySubIndustries',
								i,
								[],
							) as string[];
							if (companySubIndustries.length) {
								const companiesInclude = ((contactSearchBody.filters as IDataObject)
									.companies as IDataObject).include as IDataObject;
								companiesInclude.subIndustriesIds = companySubIndustries;
							}
							
							// Handle employee count min/max dropdowns
							const employeeMin = this.getNodeParameter(
								'contactSearchCompanyEmployeeMin',
								i,
								'',
							) as string;
							const employeeMax = this.getNodeParameter(
								'contactSearchCompanyEmployeeMax',
								i,
								'',
							) as string;
							
							if (employeeMin || employeeMax) {
								const companiesInclude = ((contactSearchBody.filters as IDataObject)
									.companies as IDataObject).include as IDataObject;
								
								const min = employeeMin ? parseInt(employeeMin) : 1;
								const max = employeeMax ? parseInt(employeeMax) : 999999;
								
								companiesInclude.sizes = [{ min, max }];
							}
							
							// Add company revenue filters
							const companyRevenueMin = this.getNodeParameter(
								'contactSearchCompanyRevenueMin',
								i,
								'',
							) as string;
							const companyRevenueMax = this.getNodeParameter(
								'contactSearchCompanyRevenueMax',
								i,
								'',
							) as string;
							
							if (companyRevenueMin || companyRevenueMax) {
								const companiesInclude = ((contactSearchBody.filters as IDataObject)
									.companies as IDataObject).include as IDataObject;
								const revenues: IDataObject[] = [{
									min: companyRevenueMin ? parseInt(companyRevenueMin) : 0,
									max: companyRevenueMax ? parseInt(companyRevenueMax) : 999999999999,
								}];
								companiesInclude.revenues = revenues;
							}
							
							// Add company locations
							const companyCountries = this.getNodeParameter(
								'contactSearchCompanyCountries',
								i,
								[],
							) as string[];
							const companyStates = this.getNodeParameter(
								'contactSearchCompanyStates',
								i,
								'',
							) as string;
							const companyCities = this.getNodeParameter(
								'contactSearchCompanyCities',
								i,
								'',
							) as string;
							
							const companyLocations: IDataObject[] = [];
							
							if (companyCountries.length) {
								companyCountries.forEach((country) => {
									companyLocations.push({ country });
								});
							}
							if (companyStates) {
								companyStates
									.split(',')
									.map((s) => s.trim())
									.filter((s) => s)
									.forEach((state) => {
										companyLocations.push({ state });
									});
							}
							if (companyCities) {
								companyCities
									.split(',')
									.map((c) => c.trim())
									.filter((c) => c)
									.forEach((city) => {
										companyLocations.push({ city });
									});
							}
							
							if (companyLocations.length) {
								const companiesInclude = ((contactSearchBody.filters as IDataObject)
									.companies as IDataObject).include as IDataObject;
								companiesInclude.locations = companyLocations;
							}

							requestOptions.body = contactSearchBody;
							break;
						}

						case 'enrichFromSearch': {
							// Get request ID - try from input first, then from parameter
							let requestId = '';
							const inputData = items[i];
							const searchData = inputData.json;
							
							// Try to get requestId from input data first
							if (searchData.requestId) {
								requestId = searchData.requestId as string;
							} else {
								requestId = this.getNodeParameter('requestId', i) as string;
							}
							
							const selectionType = this.getNodeParameter('contactSelectionType', i, 'all') as string;
							let contactIds: string[] = [];
							
							if (selectionType === 'all') {
								// Use all contact IDs from search results
								if (searchData.allContactIds && Array.isArray(searchData.allContactIds)) {
									contactIds = searchData.allContactIds as string[];
								} else if (searchData.data && Array.isArray(searchData.data)) {
									contactIds = searchData.data.map((contact: any) => contact.contactId).filter((id: any) => id);
								}
							} else if (selectionType === 'new') {
								// Use only new contact IDs (where isShown = false)
								if (searchData.newContactIds && Array.isArray(searchData.newContactIds)) {
									contactIds = searchData.newContactIds as string[];
								} else if (searchData.data && Array.isArray(searchData.data)) {
									contactIds = searchData.data
										.filter((contact: any) => contact.isShown === false)
										.map((contact: any) => contact.contactId)
										.filter((id: any) => id);
								}
							} else if (selectionType === 'specific') {
								const idsInput = this.getNodeParameter('contactIds', i, '') as string;
								contactIds = idsInput
									.split(',')
									.map((id) => id.trim())
									.filter((id) => id);
							}

							// Ensure we have valid IDs
							if (!contactIds.length) {
								throw new Error('No contact IDs found. Ensure the search operation returned results.');
							}

							requestOptions.url = '/prospecting/contact/enrich';
							requestOptions.method = 'POST';
							if (!requestOptions.headers) requestOptions.headers = {};
							requestOptions.headers['Content-Type'] = 'application/json';
							delete requestOptions.qs;

							requestOptions.body = {
								requestId,
								contactIds,
							};
							break;
						}

						case 'enrichBulk': {
							requestOptions.url = '/v2/person';
							requestOptions.method = 'POST';
							if (!requestOptions.headers) requestOptions.headers = {};
							requestOptions.headers['Content-Type'] = 'application/json';
							delete requestOptions.qs;

							const bulkType = this.getNodeParameter('bulkType', i, 'simple') as string;

							if (bulkType === 'simple') {
								const contactsList = this.getNodeParameter('contactsList', i, {}) as IDataObject;
								const contacts: IDataObject[] = [];

								if (contactsList.contact && Array.isArray(contactsList.contact)) {
									let contactIdCounter = 1;
									(contactsList.contact as IDataObject[]).forEach((contact) => {
										const contactData: IDataObject = {
											contactId: String(contactIdCounter++),
										};
										
										// Add only one identifier per contact - prioritize email
										if (contact.email) {
											contactData.email = contact.email;
										} else if (contact.linkedinUrl) {
											contactData.linkedinUrl = contact.linkedinUrl;
										} else if (contact.fullName) {
											// Use fullName with companies array structure
											contactData.fullName = contact.fullName;
											
											// Build companies array if company info is provided
											const companies: IDataObject[] = [];
											if (contact.companyName || contact.companyDomain) {
												const company: IDataObject = {
													isCurrent: true, // Default to current company
												};
												
												// Use either name or domain
												if (contact.companyDomain) {
													company.domain = contact.companyDomain;
												} else if (contact.companyName) {
													company.name = contact.companyName;
												}
												
												companies.push(company);
											}
											
											if (companies.length > 0) {
												contactData.companies = companies;
											}
										}
										
										if (Object.keys(contactData).length > 1) { // Must have contactId + identifier
											contacts.push(contactData);
										}
									});
								}

								// Build metadata object
								const metadata: IDataObject = {};
								
								const filterBy = this.getNodeParameter('bulkFilterBy', i, '') as string;
								if (filterBy) {
									metadata.filterBy = filterBy;
								}
								
								const revealEmails = this.getNodeParameter('bulkRevealEmails', i, false) as boolean;
								const revealPhones = this.getNodeParameter('bulkRevealPhones', i, false) as boolean;
								if (revealEmails) metadata.revealEmails = true;
								if (revealPhones) metadata.revealPhones = true;

								requestOptions.body = {
									contacts,
									metadata,
								};
							} else {
								// Advanced JSON mode
								const payloadRaw = this.getNodeParameter(
									'contactsPayloadJson',
									i,
									'{}',
								) as string;

								let payload: IDataObject;
								try {
									payload = JSON.parse(payloadRaw);
								} catch (e) {
									throw new Error('Contacts Payload (JSON) must be valid JSON.');
								}

								requestOptions.body = payload;
							}
							break;
						}
					}
				}

				// ===================== COMPANY OPERATIONS =====================
				if (resource === 'company') {
					switch (operation) {
						case 'enrichSingle': {
							const companySearchBy = this.getNodeParameter(
								'companySearchBy',
								i,
							) as string;

							// Single company enrich
							requestOptions.url = '/company';
							requestOptions.method = 'GET';
							delete requestOptions.body;
							requestOptions.qs = {};

							if (companySearchBy === 'domain') {
								const domain = this.getNodeParameter('domain', i) as string;
								requestOptions.qs.domain = domain;
							} else if (companySearchBy === 'name') {
								const companyName = this.getNodeParameter(
									'companyName',
									i,
								) as string;
								requestOptions.qs.company = companyName;
							}
							break;
						}

						case 'searchCompanies': {
							requestOptions.url = '/prospecting/company/search';
							requestOptions.method = 'POST';
							if (!requestOptions.headers) requestOptions.headers = {};
							requestOptions.headers['Content-Type'] = 'application/json';
							delete requestOptions.qs;

							const companySearchBody: IDataObject = {
								pages: {
									page: this.getNodeParameter('page', i, 0) as number,
									size: Math.min(this.getNodeParameter('pageSize', i, 50) as number, 50),
								},
								filters: {
									companies: { include: {} },
								},
							};

							const filters = companySearchBody.filters as IDataObject;
							const companies = filters.companies as IDataObject;
							const companiesInclude = companies.include as IDataObject;

							// Names / domains
							const searchCompanyDomains = this.getNodeParameter(
								'searchCompanyDomains',
								i,
								'',
							) as string;
							if (searchCompanyDomains) {
								const companyList = searchCompanyDomains
									.split(',')
									.map((c) => c.trim())
									.filter((c) => c);

								const domains = companyList.filter((c) => c.includes('.'));
								const names = companyList.filter((c) => !c.includes('.'));

								if (domains.length) companiesInclude.domains = domains;
								if (names.length) companiesInclude.names = names;
							}

							// Company countries / states / cities => locations[]
							const companyCountries = this.getNodeParameter(
								'companyCountries',
								i,
								[],
							) as string[];
							const companyStates = this.getNodeParameter(
								'companyStates',
								i,
								'',
							) as string;
							const companyCities = this.getNodeParameter(
								'companyCities',
								i,
								'',
							) as string;

							const companyLocations: IDataObject[] = [];

							if (companyCountries.length) {
								companyCountries.forEach((country) => companyLocations.push({ country }));
							}
							if (companyStates) {
								companyStates
									.split(',')
									.map((s) => s.trim())
									.filter((s) => s)
									.forEach((state) => companyLocations.push({ state }));
							}
							if (companyCities) {
								companyCities
									.split(',')
									.map((c) => c.trim())
									.filter((c) => c)
									.forEach((city) => companyLocations.push({ city }));
							}
							if (companyLocations.length) {
								companiesInclude.locations = companyLocations;
							}

							// Handle employee count min/max dropdowns
							const employeeMin = this.getNodeParameter(
								'companyEmployeeMin',
								i,
								'',
							) as string;
							const employeeMax = this.getNodeParameter(
								'companyEmployeeMax',
								i,
								'',
							) as string;
							
							if (employeeMin || employeeMax) {
								const min = employeeMin ? parseInt(employeeMin) : 1;
								const max = employeeMax ? parseInt(employeeMax) : 999999;
								
								companiesInclude.sizes = [{ min, max }];
							}

							// Main industry IDs
							const companyMainIndustryIds = this.getNodeParameter(
								'companyMainIndustryIds',
								i,
								[],
							) as string[];
							if (companyMainIndustryIds.length) {
								companiesInclude.mainIndustriesIds = companyMainIndustryIds;
							}
							
							// Sub-industry IDs
							const companySubIndustryIds = this.getNodeParameter(
								'companySubIndustryIds',
								i,
								[],
							) as string[];
							if (companySubIndustryIds.length) {
								companiesInclude.subIndustriesIds = companySubIndustryIds;
							}

							// Revenue min / max - should be "revenues" array
							const companyRevenueMin = this.getNodeParameter(
								'companyRevenueMin',
								i,
								'',
							) as string;
							const companyRevenueMax = this.getNodeParameter(
								'companyRevenueMax',
								i,
								'',
							) as string;

							if (companyRevenueMin || companyRevenueMax) {
								const revenues: IDataObject[] = [];
								const revenueRange: IDataObject = {};
								
								if (companyRevenueMin) {
									revenueRange.min = parseInt(companyRevenueMin);
								} else {
									revenueRange.min = 0;
								}
								
								if (companyRevenueMax) {
									revenueRange.max = parseInt(companyRevenueMax);
								} else {
									revenueRange.max = 999999999999; // Very large number if no max
								}
								
								revenues.push(revenueRange);
								companiesInclude.revenues = revenues;
							}

							requestOptions.body = companySearchBody;
							break;
						}

						case 'enrichFromSearch': {
							// FIXED: Generate a unique requestId (UUID v4)
							const crypto = require('crypto');
							const requestId = crypto.randomUUID();
							
							// Get company IDs from input or parameters
							const inputData = items[i];
							const searchData = inputData.json;
							
							const selectionType = this.getNodeParameter('companySelectionType', i, 'all') as string;
							let companiesIds: string[] = [];
							
							if (selectionType === 'all') {
								// FIXED: Try to get IDs from various possible fields
								if (searchData.allCompanyIds && Array.isArray(searchData.allCompanyIds)) {
									companiesIds = searchData.allCompanyIds as string[];
								} else if (searchData.data && Array.isArray(searchData.data)) {
									// Check for both companyId and id fields
									companiesIds = searchData.data.map((company: any) => 
										company.companyId || company.id || ''
									).filter((id: any) => id);
								} else {
									// Try to get from all input items - check multiple possible fields
									const allInputItems = this.getInputData();
									companiesIds = allInputItems
										.map(item => {
											const json = item.json;
											return json.companyId || json.id || json.company_id || '';
										})
										.filter(id => id) as string[];
								}
							} else if (selectionType === 'specific') {
								const idsInput = this.getNodeParameter('companyIds', i, '') as string;
								companiesIds = idsInput
									.split(',')
									.map((id) => id.trim())
									.filter((id) => id);
							}

							// Ensure we have valid IDs
							if (!companiesIds.length) {
								throw new Error('No company IDs found. Ensure the search operation returned results or provide company IDs.');
							}

							requestOptions.url = '/prospecting/company/enrich';
							requestOptions.method = 'POST';
							if (!requestOptions.headers) requestOptions.headers = {};
							requestOptions.headers['Content-Type'] = 'application/json';
							delete requestOptions.qs;

							requestOptions.body = {
								requestId: requestId,
								companiesIds: companiesIds, // FIXED: API expects 'companiesIds' not 'companyIds'
							};
							break;
						}

						case 'enrichBulk': {
							requestOptions.url = '/v2/company';
							requestOptions.method = 'POST';
							if (!requestOptions.headers) requestOptions.headers = {};
							requestOptions.headers['Content-Type'] = 'application/json';
							delete requestOptions.qs;

							const bulkType = this.getNodeParameter('companyBulkType', i, 'simple') as string;

							if (bulkType === 'simple') {
								const companiesList = this.getNodeParameter('companiesList', i, {}) as IDataObject;
								const companies: IDataObject[] = [];

								if (companiesList.company && Array.isArray(companiesList.company)) {
									let companyIdCounter = 1;
									(companiesList.company as IDataObject[]).forEach((company) => {
										const companyData: IDataObject = {
											id: String(companyIdCounter++),
										};
										
										// Add either name or domain
										if (company.name) companyData.name = company.name;
										if (company.domain) companyData.domain = company.domain;

										if (Object.keys(companyData).length > 1) { // Must have id + identifier
											companies.push(companyData);
										}
									});
								}

								requestOptions.body = {
									companies,
								};
							} else {
								// Advanced JSON mode
								const payloadRaw = this.getNodeParameter(
									'companiesPayloadJson',
									i,
									'{}',
								) as string;

								let payload: IDataObject;
								try {
									payload = JSON.parse(payloadRaw);
								} catch (e) {
									throw new Error('Companies Payload (JSON) must be valid JSON.');
								}

								requestOptions.body = payload;
							}
							break;
						}
					}
				}

				// Use httpRequestWithAuthentication to automatically handle auth
				const response = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'lushaApi',
					requestOptions,
				);

				let json: IDataObject = response as IDataObject;

				// ===================== FRIENDLY CONTACT ENRICH OUTPUT =====================
				if (resource === 'contact' && operation === 'enrichSingle') {
					const simplified = this.getNodeParameter(
						'contactSimplifiedOutput',
						i,
						true,
					) as boolean;

					if (simplified) {
						const raw = response as any;
						const contact = raw?.contact?.data ?? {};

						const primaryEmail = Array.isArray(contact.emailAddresses)
							? contact.emailAddresses[0]
							: undefined;
						const primaryPhone = Array.isArray(contact.phoneNumbers)
							? contact.phoneNumbers[0]
							: undefined;

						const company = contact.company ?? {};
						const location = contact.location ?? {};

						json = {
							// High-level contact info
							firstName: contact.firstName ?? '',
							lastName: contact.lastName ?? '',
							fullName: contact.fullName ?? '',
							personId: contact.personId ?? '',
							jobTitle: contact.jobTitle?.title ?? '',
							departments: contact.jobTitle?.departments ?? [],
							seniority: contact.jobTitle?.seniority ?? '',

							// Primary contact channels
							primaryEmail: primaryEmail?.email ?? '',
							primaryEmailType: primaryEmail?.emailType ?? '',
							primaryEmailConfidence: primaryEmail?.emailConfidence ?? '',
							primaryPhone: primaryPhone?.number ?? '',
							primaryPhoneType: primaryPhone?.phoneType ?? '',
							primaryPhoneDoNotCall: primaryPhone?.doNotCall ?? false,

							// Location
							locationCountry: location.country ?? '',
							locationCountryIso2: location.country_iso2 ?? '',
							locationContinent: location.continent ?? '',
							locationCity: location.city ?? '',
							locationState: location.state ?? '',
							locationStateCode: location.state_code ?? '',
							locationCoordinates: location.location_coordinates ?? [],

							// Social
							linkedinProfile: contact.socialLinks?.linkedin ?? '',

							// Company basic info
							companyName: company.name ?? '',
							companyDomain: company.domain ?? company.fqdn ?? '',
							companyDescription: company.description ?? '',
							companyHomepage: company.homepageUrl ?? '',
							companySize: company.companySize ?? [],
							revenueRange: company.revenueRange ?? [],
							companyMainIndustry: company.mainIndustry ?? '',
							companySubIndustry: company.subIndustry ?? '',
							companyLogoUrl: company.logoUrl ?? '',
							companyLinkedin: company.social?.linkedin ?? '',
							companyCrunchbase: company.social?.crunchbase ?? '',

							// Company location
							companyLocation: company.location?.rawLocation ?? '',
							companyLocationCity: company.location?.city ?? '',
							companyLocationState: company.location?.state ?? '',
							companyLocationStateCode: company.location?.stateCode ?? '',
							companyLocationCountry: company.location?.country ?? '',
							companyLocationCountryIso2: company.location?.countryIso2 ?? '',
							companyLocationContinent: company.location?.continent ?? '',
							companyLocationCoordinates:
								company.location?.locationCoordinates ?? [],

							// Extras
							specialities: company.specialities ?? [],
							technologies: (company.technologies ?? []).map(
								(t: any) => t.name,
							),

							// Keep everything for debugging / full access
							raw,
						};
					}
				}

				// ===================== FRIENDLY COMPANY ENRICH OUTPUT =====================
				if (resource === 'company' && operation === 'enrichSingle') {
					const simplified = this.getNodeParameter(
						'companySimplifiedOutput',
						i,
						true,
					) as boolean;

					if (simplified) {
						const raw = response as any;
						// company enrich returns the payload directly or under data – cover both cases
						const company = raw?.data ?? raw;

						const location = company.location ?? {};
						const social = company.social ?? {};

						json = {
							companyId: company.id ?? company.companyId ?? '',
							name: company.name ?? '',
							domain: company.domain ?? company.fqdn ?? '',
							description: company.description ?? '',
							employees: company.employees ?? '',
							founded: company.founded ?? '',
							fqdn: company.fqdn ?? '',
							logoUrl: company.logoUrl ?? '',
							mainIndustry: company.mainIndustry ?? '',
							subIndustry: company.subIndustry ?? '',
							companySize: company.companySize ?? [],
							revenueRange: company.revenueRange ?? [],

							locationCity: location.city ?? '',
							locationState: location.state ?? '',
							locationStateCode: location.stateCode ?? '',
							locationCountry: location.country ?? '',
							locationCountryIso2: location.countryIso2 ?? '',
							locationContinent: location.continent ?? '',
							locationFullLocation:
								location.fullLocation ?? location.rawLocation ?? '',
							locationCoordinates: location.locationCoordinates ?? [],

							linkedinProfile: social.linkedin?.url ?? social.linkedin ?? '',
							crunchbaseProfile:
								social.crunchbase?.url ?? social.crunchbase ?? '',

							categories: company.categories ?? [],
							specialities: company.specialities ?? [],
							technologies: (company.technologies ?? []).map(
								(t: any) => t.name,
							),

							// Funding & intent – keep raw structures
							funding: company.funding ?? {},
							intent: company.intent ?? {},

							raw,
						};
					}
				}

				// ===================== HANDLE SEARCH RESULTS =====================
				if ((resource === 'contact' && operation === 'searchContacts') ||
					(resource === 'company' && operation === 'searchCompanies')) {
					const searchResponse = response as any;
					
					// Add additional fields for easier workflow usage
					if (searchResponse.data && Array.isArray(searchResponse.data)) {
						if (resource === 'contact') {
							// Extract contact IDs
							const allContactIds = searchResponse.data.map((item: any) => item.contactId);
							const visibleContactIds = searchResponse.data
								.filter((item: any) => item.isShown === true)
								.map((item: any) => item.contactId);
							const newContactIds = searchResponse.data
								.filter((item: any) => item.isShown === false)
								.map((item: any) => item.contactId);
							
							json = {
								...searchResponse,
								allContactIds,
								visibleContactIds,
								newContactIds,
							};
						} else {
							// Extract company IDs for company search - FIXED to look for id field
							const allCompanyIds = searchResponse.data.map((item: any) => 
								item.companyId || item.id || ''
							).filter((id: string) => id);
							
							json = {
								...searchResponse,
								allCompanyIds,
							};
						}
					}
				}

				returnData.push({
					json,
					pairedItem: { item: i },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					const errorMessage =
						error instanceof Error ? error.message : 'An error occurred';
					returnData.push({
						json: {
							error: errorMessage,
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
import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
	IDataObject,
	NodeConnectionTypes,
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
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
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
						name: 'Enrich Contacts',
						value: 'enrichBulk',
						action: 'Enrich contacts',
						description: 'Enrich one or more contacts with additional information',
					},
					{
						name: 'Search and Enrich',
						value: 'searchAndEnrich',
						action: 'Search and enrich contacts',
						description: 'Find and reveal data for 1–100 contacts in a single call',
					},
					{
						name: 'Search Contacts',
						value: 'searchContacts',
						action: 'Search for contacts by identifier',
						description: 'Locate contacts by identifier (name+company, email, LinkedIn URL, or Lusha ID)',
					},
					{
						name: 'Prospect Contacts',
						value: 'prospectingContacts',
						action: 'Prospect contacts by ICP filters',
						description: 'Discover contacts matching your ICP using rich filter criteria',
					},
					{
						name: 'Enrich from Search',
						value: 'enrichFromSearch',
						action: 'Enrich contacts from search results',
						description: 'Enrich contacts found through a previous search',
					},
					{
						name: 'Search Lookalikes',
						value: 'searchLookalikes',
						action: 'Find lookalike contacts',
						description: 'Find contacts similar to your seed contacts (5–100 seeds required)',
					},
				],
				default: 'enrichBulk',
			},

			// ===== CONTACT SEARCH (identifier-based) FIELDS =====
			{
				displayName: 'Input Mode',
				name: 'searchContactsInputMode',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Simple — Emails / LinkedIn URLs / IDs',
						value: 'simple',
						description: 'Paste comma-separated emails, LinkedIn URLs, or Lusha IDs',
					},
					{
						name: 'Advanced — Full Identifier List',
						value: 'advanced',
						description: 'Build a list with full name + company combinations',
					},
				],
				default: 'simple',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['searchContacts'],
					},
				},
			},
			{
				displayName: 'Emails',
				name: 'searchContactsEmails',
				type: 'string',
				default: '',
				placeholder: 'john@acme.com, jane@example.com',
				description: 'One or more email addresses, comma-separated',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['searchContacts'],
						searchContactsInputMode: ['simple'],
					},
				},
			},
			{
				displayName: 'LinkedIn URLs',
				name: 'searchContactsLinkedinUrls',
				type: 'string',
				default: '',
				placeholder: 'https://www.linkedin.com/in/alice, https://www.linkedin.com/in/bob',
				description: 'One or more LinkedIn profile URLs, comma-separated',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['searchContacts'],
						searchContactsInputMode: ['simple'],
					},
				},
			},
			{
				displayName: 'Lusha IDs',
				name: 'searchContactsLushaIds',
				type: 'string',
				default: '',
				placeholder: '12345, 67890',
				description: 'One or more Lusha contact IDs, comma-separated',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['searchContacts'],
						searchContactsInputMode: ['simple'],
					},
				},
			},
			{
				displayName: 'Contacts',
				name: 'searchContactsList',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add Contact',
				default: { contact: [] },
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['searchContacts'],
						searchContactsInputMode: ['advanced'],
					},
				},
				description: 'List of contacts to search. Each contact needs at least one identifier.',
				options: [
					{
						name: 'contact',
						displayName: 'Contact',
						values: [
							{
								displayName: 'Client Reference ID',
								name: 'clientReferenceId',
								type: 'string',
								default: '',
								description: 'Your own reference ID echoed back in the response',
							},
							{
								displayName: 'Lusha ID',
								name: 'id',
								type: 'string',
								default: '',
								description: 'Lusha contact ID',
							},
							{
								displayName: 'LinkedIn URL',
								name: 'linkedinUrl',
								type: 'string',
								default: '',
								placeholder: 'https://www.linkedin.com/in/username',
								description: 'LinkedIn profile URL',
							},
							{
								displayName: 'Email',
								name: 'email',
								type: 'string',
								default: '',
								placeholder: 'name@company.com',
								description: 'Email address',
							},
							{
								displayName: 'First Name',
								name: 'firstName',
								type: 'string',
								default: '',
								description: 'First name (use with Last Name + Company Name or Domain)',
							},
							{
								displayName: 'Last Name',
								name: 'lastName',
								type: 'string',
								default: '',
								description: 'Last name (use with First Name + Company Name or Domain)',
							},
							{
								displayName: 'Company Name',
								name: 'companyName',
								type: 'string',
								default: '',
								description: 'Company name (use with First Name + Last Name)',
							},
							{
								displayName: 'Company Domain',
								name: 'companyDomain',
								type: 'string',
								default: '',
								placeholder: 'lusha.com',
								description: 'Company domain (use with First Name + Last Name)',
							},
						],
					},
				],
			},
			{
				displayName: 'Options',
				name: 'searchContactsOptions',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['searchContacts'],
					},
				},
				options: [
					{
						displayName: 'Include Partial Profiles',
						name: 'includePartialProfiles',
						type: 'boolean',
						default: false,
						description: 'Whether to include contacts where only partial data is available',
					},
					{
						displayName: 'Signal Types',
						name: 'signalTypes',
						type: 'multiOptions',
						options: [
							{ name: 'All Signals', value: 'allSignals' },
							{ name: 'Promotion', value: 'promotion' },
							{ name: 'Company Change', value: 'companyChange' },
						],
						default: [],
						description: 'Narrow results to contacts with recent signal activity',
					},
					{
						displayName: 'Signal Start Date',
						name: 'signalStartDate',
						type: 'string',
						default: '',
						placeholder: '2025-01-01',
						description: 'Only include signals on or after this date (YYYY-MM-DD)',
					},
					{
						displayName: 'Max Results Per Signal',
						name: 'maxResultsPerSignal',
						type: 'number',
						default: 0,
						description: 'Maximum number of results per signal type (0 = no limit)',
					},
				],
			},

			// ===== CONTACT PROSPECTING (filter-based) FIELDS =====
			{
				displayName: 'Job Titles',
				name: 'jobTitles',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['prospectingContacts'],
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
						operation: ['prospectingContacts'],
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
						operation: ['prospectingContacts'],
					},
				},
			},
			{
				displayName: 'Countries',
				name: 'countries',
				type: 'multiOptions',
				options: [
					{ name: 'United States', value: 'US' },
					{ name: 'India', value: 'IN' },
					{ name: 'United Kingdom', value: 'GB' },
					{ name: 'Brazil', value: 'BR' },
					{ name: 'Canada', value: 'CA' },
					{ name: 'Australia', value: 'AU' },
					{ name: 'France', value: 'FR' },
					{ name: 'Germany', value: 'DE' },
					{ name: 'Netherlands', value: 'NL' },
					{ name: 'Italy', value: 'IT' },
					{ name: 'South Africa', value: 'ZA' },
					{ name: 'Mexico', value: 'MX' },
					{ name: 'Turkey', value: 'TR' },
					{ name: 'Sweden', value: 'SE' },
					{ name: 'China', value: 'CN' },
					{ name: 'Indonesia', value: 'ID' },
					{ name: 'Belgium', value: 'BE' },
					{ name: 'Spain', value: 'ES' },
					{ name: 'United Arab Emirates', value: 'AE' },
					{ name: 'Argentina', value: 'AR' },
					{ name: 'Switzerland', value: 'CH' },
					{ name: 'Singapore', value: 'SG' },
					{ name: 'Saudi Arabia', value: 'SA' },
					{ name: 'Ireland', value: 'IE' },
					{ name: 'Colombia', value: 'CO' },
					{ name: 'Chile', value: 'CL' },
					{ name: 'Malaysia', value: 'MY' },
					{ name: 'Egypt', value: 'EG' },
					{ name: 'Nigeria', value: 'NG' },
					{ name: 'Japan', value: 'JP' },
					{ name: 'Hong Kong', value: 'HK' },
					{ name: 'Finland', value: 'FI' },
					{ name: 'Denmark', value: 'DK' },
					{ name: 'Taiwan', value: 'TW' },
					{ name: 'Bangladesh', value: 'BD' },
					{ name: 'Austria', value: 'AT' },
					{ name: 'Czech Republic', value: 'CZ' },
					{ name: 'Peru', value: 'PE' },
					{ name: 'Kenya', value: 'KE' },
					{ name: 'Vietnam', value: 'VN' },
					{ name: 'Poland', value: 'PL' },
					{ name: 'Ukraine', value: 'UA' },
					{ name: 'Thailand', value: 'TH' },
					{ name: 'South Korea', value: 'KR' },
					{ name: 'Iran', value: 'IR' },
					{ name: 'Morocco', value: 'MA' },
					{ name: 'Venezuela', value: 'VE' },
					{ name: 'Hungary', value: 'HU' },
					{ name: 'Sri Lanka', value: 'LK' },
					{ name: 'New Zealand', value: 'NZ' },
					{ name: 'Portugal', value: 'PT' },
					{ name: 'Greece', value: 'GR' },
					{ name: 'Romania', value: 'RO' },
					{ name: 'Norway', value: 'NO' },
					{ name: 'Russia', value: 'RU' },
					{ name: 'Philippines', value: 'PH' },
					{ name: 'Israel', value: 'IL' },
					{ name: 'Qatar', value: 'QA' },
					{ name: 'Kuwait', value: 'KW' },
					{ name: 'Pakistan', value: 'PK' },
				],
				default: [],
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['prospectingContacts'],
					},
				},
				description: 'Filter contacts by country (ISO-2 codes sent to API)',
			},
			// Company filters for contact search
			{
			  displayName: 'Search Filters',
			  name: 'contactSearchFilters',
			  type: 'collection',
			  placeholder: 'Add filter',
			  default: {},
			  displayOptions: {
			    show: {
			      resource: ['contact'],
			      operation: ['prospectingContacts'],
			    },
			  },
			  options: [
				  {
            displayName: 'States',
            name: 'states',  // Contact's location state
            type: 'string',
            default: '',
            description: 'States to search in (comma-separated)',
            placeholder: 'California, New York, Texas',
        },
        {
            displayName: 'Cities',
            name: 'cities',  // Contact's location city
            type: 'string',
            default: '',
            description: 'Cities to search in (comma-separated)',
            placeholder: 'San Francisco, New York, London',
        },
        {
            displayName: 'Company Names / Domains',
            name: 'companyDomains',
            type: 'string',
            default: '',
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
            description: 'Filter contacts that have these data points',
        },
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
				description: 'Filter by company sub-industries',
			},
			{
				displayName: 'Company Countries',
				name: 'contactSearchCompanyCountries',
				type: 'multiOptions',
				options: [
					{ name: 'United States', value: 'US' },
					{ name: 'India', value: 'IN' },
					{ name: 'United Kingdom', value: 'GB' },
					{ name: 'Brazil', value: 'BR' },
					{ name: 'Canada', value: 'CA' },
					{ name: 'Australia', value: 'AU' },
					{ name: 'France', value: 'FR' },
					{ name: 'Germany', value: 'DE' },
					{ name: 'Netherlands', value: 'NL' },
					{ name: 'Italy', value: 'IT' },
					{ name: 'South Africa', value: 'ZA' },
					{ name: 'Mexico', value: 'MX' },
					{ name: 'Turkey', value: 'TR' },
					{ name: 'Sweden', value: 'SE' },
					{ name: 'China', value: 'CN' },
					{ name: 'Indonesia', value: 'ID' },
					{ name: 'Belgium', value: 'BE' },
					{ name: 'Spain', value: 'ES' },
					{ name: 'United Arab Emirates', value: 'AE' },
					{ name: 'Argentina', value: 'AR' },
					{ name: 'Switzerland', value: 'CH' },
					{ name: 'Singapore', value: 'SG' },
					{ name: 'Saudi Arabia', value: 'SA' },
					{ name: 'Ireland', value: 'IE' },
					{ name: 'Colombia', value: 'CO' },
					{ name: 'Chile', value: 'CL' },
					{ name: 'Malaysia', value: 'MY' },
					{ name: 'Egypt', value: 'EG' },
					{ name: 'Nigeria', value: 'NG' },
					{ name: 'Japan', value: 'JP' },
					{ name: 'Hong Kong', value: 'HK' },
					{ name: 'Finland', value: 'FI' },
					{ name: 'Denmark', value: 'DK' },
					{ name: 'Taiwan', value: 'TW' },
					{ name: 'Bangladesh', value: 'BD' },
					{ name: 'Austria', value: 'AT' },
					{ name: 'Czech Republic', value: 'CZ' },
					{ name: 'Peru', value: 'PE' },
					{ name: 'Kenya', value: 'KE' },
					{ name: 'Vietnam', value: 'VN' },
					{ name: 'Poland', value: 'PL' },
					{ name: 'Ukraine', value: 'UA' },
					{ name: 'Thailand', value: 'TH' },
					{ name: 'South Korea', value: 'KR' },
					{ name: 'Iran', value: 'IR' },
					{ name: 'Morocco', value: 'MA' },
					{ name: 'Venezuela', value: 'VE' },
					{ name: 'Hungary', value: 'HU' },
					{ name: 'Sri Lanka', value: 'LK' },
					{ name: 'New Zealand', value: 'NZ' },
					{ name: 'Portugal', value: 'PT' },
					{ name: 'Greece', value: 'GR' },
					{ name: 'Romania', value: 'RO' },
					{ name: 'Norway', value: 'NO' },
					{ name: 'Russia', value: 'RU' },
					{ name: 'Philippines', value: 'PH' },
					{ name: 'Israel', value: 'IL' },
					{ name: 'Qatar', value: 'QA' },
					{ name: 'Kuwait', value: 'KW' },
					{ name: 'Pakistan', value: 'PK' },
				],
				default: [],
				description: 'Filter contacts by company country (ISO-2 codes sent to API)',
			},
			{
				displayName: 'Company States',
				name: 'contactSearchCompanyStates',
				type: 'string',
				default: '',
				description: 'Filter contacts by company states (comma-separated)',
				placeholder: 'California, New York',
			},
			{
				displayName: 'Company Cities',
				name: 'contactSearchCompanyCities',
				type: 'string',
				default: '',
				description: 'Filter contacts by company cities (comma-separated)',
				placeholder: 'San Francisco, New York',
			},
			{
				displayName: 'Technologies',
				name: 'contactSearchTechnologies',
				type: 'string',
				default: '',
				description: 'Filter by company tech stack (comma-separated, e.g., Salesforce, HubSpot)',
				placeholder: 'Salesforce, HubSpot, AWS',
			},
			{
				displayName: 'Intent Topics',
				name: 'contactSearchIntentTopics',
				type: 'string',
				default: '',
				description: 'Filter by company buyer-intent topics (comma-separated)',
				placeholder: 'CRM, Sales Automation',
			},
			{
				displayName: 'NAICS Codes',
				name: 'contactSearchNaicsCodes',
				type: 'string',
				default: '',
				description: 'Filter by NAICS industry classification codes (comma-separated)',
				placeholder: '511210, 541511',
			},
			{
				displayName: 'SIC Codes',
				name: 'contactSearchSicsCodes',
				type: 'string',
				default: '',
				description: 'Filter by SIC industry classification codes (comma-separated)',
				placeholder: '7372, 7371',
			},
			]
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

			// ===== CONTACT LOOKALIKE FIELDS =====
			{
				displayName: 'Seed Type',
				name: 'contactLookalikeSeedType',
				type: 'options',
				options: [
					{ name: 'Emails', value: 'emails' },
					{ name: 'LinkedIn URLs', value: 'linkedinUrls' },
					{ name: 'Name + Company', value: 'nameAndCompany' },
					{ name: 'Lusha Contact IDs', value: 'contactIds' },
				],
				default: 'emails',
				displayOptions: {
					show: { resource: ['contact'], operation: ['searchLookalikes'] },
				},
				description: 'How to identify seed contacts (5–100 total seeds required)',
			},
			{
				displayName: 'Seeds',
				name: 'contactLookalikeSeeds',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				displayOptions: {
					show: { resource: ['contact'], operation: ['searchLookalikes'] },
				},
				description: 'Seed contacts to find lookalikes for (5–100 required)',
				options: [
					{
						name: 'seed',
						displayName: 'Seed',
						values: [
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Email, LinkedIn URL, or Lusha contact ID depending on Seed Type',
							},
							{
								displayName: 'First Name',
								name: 'firstName',
								type: 'string',
								default: '',
								displayOptions: { show: { '/contactLookalikeSeedType': ['nameAndCompany'] } },
							},
							{
								displayName: 'Last Name',
								name: 'lastName',
								type: 'string',
								default: '',
								displayOptions: { show: { '/contactLookalikeSeedType': ['nameAndCompany'] } },
							},
							{
								displayName: 'Company Domain',
								name: 'companyDomain',
								type: 'string',
								default: '',
								placeholder: 'acme.com',
								displayOptions: { show: { '/contactLookalikeSeedType': ['nameAndCompany'] } },
								description: 'Company domain or name (at least one required)',
							},
							{
								displayName: 'Company Name',
								name: 'companyName',
								type: 'string',
								default: '',
								displayOptions: { show: { '/contactLookalikeSeedType': ['nameAndCompany'] } },
							},
						],
					},
				],
			},
			{
				displayName: 'Limit',
				name: 'contactLookalikeLimit',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 50 },
				default: 25,
				displayOptions: {
					show: { resource: ['contact'], operation: ['searchLookalikes'] },
				},
				description: 'Number of lookalike results to return (1–50)',
			},
			{
				displayName: 'Additional Options',
				name: 'contactLookalikeOptions',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: {
					show: { resource: ['contact'], operation: ['searchLookalikes'] },
				},
				options: [
					{
						displayName: 'Dedupe Session ID',
						name: 'dedupeSessionId',
						type: 'string',
						default: '',
						description: 'Paste the dedupeSessionId from a prior call to get the next page of non-duplicate results. Sessions expire after 30 days.',
					},
					{
						displayName: 'Exclude Emails',
						name: 'excludeEmails',
						type: 'string',
						default: '',
						placeholder: 'a@b.com, c@d.com',
						description: 'Comma-separated emails to exclude from results (e.g., existing customers)',
					},
				],
			},

			// ===== CONTACT BULK ENRICH FIELDS =====
			{
				displayName: 'Bulk Type',
				name: 'bulkType',
				type: 'options',
				options: [
					{
						name: 'Email List',
						value: 'emailList',
						description: 'Paste a comma-separated list of email addresses',
					},
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
				default: 'emailList',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrichBulk'],
					},
				},
			},
			// Bulk metadata fields (wrapped in collection)
			{
				displayName: 'Additional Options',
				name: 'contactBulkAdditionalOptions',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrichBulk'],
						bulkType: ['simple'],
					},
				},
				options: [
					{
						displayName: 'Filter By',
						name: 'bulkFilterBy',
						type: 'options',
						options: [
							{ name: 'No Filter', value: '' },
							{ name: 'Email Addresses', value: 'emailAddresses' },
							{ name: 'Phone Numbers', value: 'phoneNumbers' },
						],
						default: '',
						description:
							'Filter contacts based on the presence of email addresses or phone numbers',
					},
					{
						displayName: 'Reveal Emails',
						name: 'bulkRevealEmails',
						type: 'boolean',
						default: false,
						description: 'Set to true to retrieve email addresses of contacts',
					},
					{
						displayName: 'Reveal Phones',
						name: 'bulkRevealPhones',
						type: 'boolean',
						default: false,
						description: 'Set to true to retrieve phone numbers of contacts',
					},
				],
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
			// Email list field
			{
				displayName: 'Email Addresses',
				name: 'bulkEmailList',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				placeholder: 'john@acme.com, jane@corp.com, bob@example.com',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrichBulk'],
						bulkType: ['emailList'],
					},
				},
				description: 'Comma-separated list of email addresses to enrich (up to 100)',
			},
			// Advanced JSON field
			{
				displayName: 'Contacts Payload (JSON)',
				name: 'contactsPayloadJson',
				type: 'string',
				typeOptions: {
					rows: 10,
				},
				default: '{\n  "contacts": [],\n  "reveal": ["emails", "phones"]\n}',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrichBulk'],
						bulkType: ['json'],
					},
				},
				description: 'Raw JSON body for POST /v3/contacts/search-and-enrich bulk enrichment (contacts array).',
			},

			// ===== CONTACT SEARCH AND ENRICH FIELDS =====
			{
				displayName: 'Contacts',
				name: 'searchAndEnrichContacts',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				displayOptions: { show: { resource: ['contact'], operation: ['searchAndEnrich'] } },
				description: 'List of contacts to search and enrich (up to 100). Fill whichever identifier you have — Lusha ID takes priority, then email, LinkedIn URL, then name + company.',
				options: [
					{
						name: 'contact',
						displayName: 'Contact',
						values: [
							{ displayName: 'Email', name: 'email', type: 'string', default: '', placeholder: 'john@example.com' },
							{ displayName: 'LinkedIn URL', name: 'linkedinUrl', type: 'string', default: '', placeholder: 'https://www.linkedin.com/in/johndoe' },
							{ displayName: 'First Name', name: 'firstName', type: 'string', default: '', placeholder: 'John' },
							{ displayName: 'Last Name', name: 'lastName', type: 'string', default: '', placeholder: 'Doe' },
							{ displayName: 'Company Name', name: 'companyName', type: 'string', default: '', placeholder: 'Acme Inc' },
							{ displayName: 'Company Domain', name: 'companyDomain', type: 'string', default: '', placeholder: 'acme.com' },
							{ displayName: 'Lusha ID', name: 'lushaId', type: 'string', default: '', description: 'Lusha entity ID from a previous search or enrich result' },
							{ displayName: 'Client Reference ID', name: 'clientReferenceId', type: 'string', default: '', description: 'Your own reference ID, returned in the response for correlation' },
						],
					},
				],
			},
			{
				displayName: 'Reveal',
				name: 'searchAndEnrichReveal',
				type: 'multiOptions',
				options: [
					{ name: 'Emails', value: 'emails' },
					{ name: 'Phone Numbers', value: 'phones' },
				],
				default: ['emails', 'phones'],
				displayOptions: { show: { resource: ['contact'], operation: ['searchAndEnrich'] } },
				description: 'Which contact data to unlock. Billing applies per revealed field.',
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
						name: 'Enrich Companies',
						value: 'enrichBulk',
						action: 'Enrich companies',
						description: 'Enrich one or more companies with additional information',
					},
					{
						name: 'Search and Enrich',
						value: 'searchAndEnrich',
						action: 'Search and enrich companies',
						description: 'Find and reveal data for 1–100 companies in a single call',
					},
					{
						name: 'Search Companies',
						value: 'searchCompanies',
						action: 'Search for companies by identifier',
						description: 'Locate companies by identifier (name, domain, or Lusha ID)',
					},
					{
						name: 'Prospect Companies',
						value: 'prospectingCompanies',
						action: 'Prospect companies by ICP filters',
						description: 'Discover companies matching your ICP using rich filter criteria',
					},
					{
						name: 'Enrich from Search',
						value: 'enrichFromSearch',
						action: 'Enrich companies from search results',
						description: 'Enrich companies found through a previous search',
					},
					{
						name: 'Search Lookalikes',
						value: 'searchLookalikes',
						action: 'Find lookalike companies',
						description: 'Find companies similar to your seed companies (5–100 seeds required)',
					},
				],
				default: 'enrichBulk',
			},

			// ===== COMPANY SEARCH (identifier-based) FIELDS =====
			{
				displayName: 'Input Mode',
				name: 'searchCompaniesInputMode',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Simple — Domains / Names',
						value: 'simple',
						description: 'Paste comma-separated domains or company names',
					},
					{
						name: 'Advanced — Full Identifier List',
						value: 'advanced',
						description: 'Build a list with explicit ID, name, and domain per company',
					},
				],
				default: 'simple',
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['searchCompanies'],
					},
				},
			},
			{
				displayName: 'Domains / Names',
				name: 'searchCompaniesSimpleInput',
				type: 'string',
				default: '',
				placeholder: 'lusha.com, microsoft.com, Acme Corp',
				description: 'One or more company domains or names, comma-separated. Values containing a dot are treated as domains; others as names.',
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['searchCompanies'],
						searchCompaniesInputMode: ['simple'],
					},
				},
			},
			{
				displayName: 'Companies',
				name: 'searchCompaniesList',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add Company',
				default: { company: [] },
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['searchCompanies'],
						searchCompaniesInputMode: ['advanced'],
					},
				},
				description: 'List of companies to search. Each company needs at least one identifier.',
				options: [
					{
						name: 'company',
						displayName: 'Company',
						values: [
							{
								displayName: 'Client Reference ID',
								name: 'clientReferenceId',
								type: 'string',
								default: '',
								description: 'Your own reference ID echoed back in the response',
							},
							{
								displayName: 'Lusha ID',
								name: 'id',
								type: 'string',
								default: '',
								description: 'Lusha company ID',
							},
							{
								displayName: 'Company Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Company name',
							},
							{
								displayName: 'Domain',
								name: 'domain',
								type: 'string',
								default: '',
								placeholder: 'lusha.com',
								description: 'Company domain',
							},
						],
					},
				],
			},
			{
				displayName: 'Options',
				name: 'searchCompaniesOptions',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['searchCompanies'],
					},
				},
				options: [
					{
						displayName: 'Include Partial Profiles',
						name: 'includePartialProfiles',
						type: 'boolean',
						default: false,
						description: 'Whether to include companies where only partial data is available',
					},
					{
						displayName: 'Signal Types',
						name: 'signalTypes',
						type: 'multiOptions',
						options: [
							{ name: 'All Signals', value: 'allSignals' },
							{ name: 'Hiring', value: 'hiring' },
							{ name: 'Technology Change', value: 'technologyChange' },
							{ name: 'New Funding', value: 'newFunding' },
							{ name: 'Leadership Change', value: 'leadershipChange' },
							{ name: 'Company Growth', value: 'companyGrowth' },
							{ name: 'News Mention', value: 'newsMention' },
						],
						default: [],
						description: 'Narrow results to companies with recent signal activity',
					},
					{
						displayName: 'Signal Start Date',
						name: 'signalStartDate',
						type: 'string',
						default: '',
						placeholder: '2025-01-01',
						description: 'Only include signals on or after this date (YYYY-MM-DD)',
					},
					{
						displayName: 'Max Results Per Signal',
						name: 'maxResultsPerSignal',
						type: 'number',
						default: 0,
						description: 'Maximum number of results per signal type (0 = no limit)',
					},
				],
			},

			// ===== COMPANY PROSPECTING (filter-based) FIELDS =====
			{
				displayName: 'Company Names / Domains',
				name: 'searchCompanyDomains',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['prospectingCompanies'],
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
						operation: ['prospectingCompanies'],
					},
				},
				description: 'Filter by company countries',
			},
			{
		  displayName: 'Search Filters',
		  name: 'companySearchFilters',
		  type: 'collection',
		  placeholder: 'Add filter',
		  default: {},
		  displayOptions: {
		    show: {
		      resource: ['company'],
		      operation: ['prospectingCompanies'],
		    },
		  },
		  options: [
			{
				displayName: 'Company States',
				name: 'companyStates',
				type: 'string',
				default: '',
				description: 'Filter by company states (comma-separated)',
				placeholder: 'California, New York, Texas',
			},
			{
				displayName: 'Company Cities',
				name: 'companyCities',
				type: 'string',
				default: '',
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
				description: 'Maximum annual revenue in USD',
			},
		]
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

			// ===== COMPANY LOOKALIKE FIELDS =====
			{
				displayName: 'Seed Type',
				name: 'companyLookalikeSeedType',
				type: 'options',
				options: [
					{ name: 'Domains', value: 'domains' },
					{ name: 'LinkedIn URLs', value: 'linkedinUrls' },
				],
				default: 'domains',
				displayOptions: {
					show: { resource: ['company'], operation: ['searchLookalikes'] },
				},
				description: 'How to identify seed companies (5–100 total seeds required)',
			},
			{
				displayName: 'Seeds',
				name: 'companyLookalikeSeeds',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				displayOptions: {
					show: { resource: ['company'], operation: ['searchLookalikes'] },
				},
				description: 'Seed companies to find lookalikes for (5–100 required)',
				options: [
					{
						name: 'seed',
						displayName: 'Seed',
						values: [
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Company domain (e.g. lusha.com) or LinkedIn company URL',
							},
						],
					},
				],
			},
			{
				displayName: 'Limit',
				name: 'companyLookalikeLimit',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 100 },
				default: 25,
				displayOptions: {
					show: { resource: ['company'], operation: ['searchLookalikes'] },
				},
				description: 'Number of lookalike results to return (1–100)',
			},
			{
				displayName: 'Additional Options',
				name: 'companyLookalikeOptions',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: {
					show: { resource: ['company'], operation: ['searchLookalikes'] },
				},
				options: [
					{
						displayName: 'Dedupe Session ID',
						name: 'dedupeSessionId',
						type: 'string',
						default: '',
						description: 'Paste the dedupeSessionId from a prior call to get the next page of non-duplicate results. Sessions expire after 30 days.',
					},
					{
						displayName: 'Exclude Domains',
						name: 'excludeDomains',
						type: 'string',
						default: '',
						placeholder: 'competitor.com, other.com',
						description: 'Comma-separated company domains to exclude from results',
					},
				],
			},

			// ===== COMPANY ENRICH FIELDS =====
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
				description: 'Raw JSON body for POST /v3/companies/search-and-enrich bulk enrichment (companies array).',
			},

			// ===== COMPANY SEARCH AND ENRICH FIELDS =====
			{
				displayName: 'Companies',
				name: 'searchAndEnrichCompanies',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				displayOptions: { show: { resource: ['company'], operation: ['searchAndEnrich'] } },
				description: 'List of companies to search and enrich (up to 100). Fill whichever identifier you have — Lusha ID takes priority, then domain, LinkedIn URL, then name.',
				options: [
					{
						name: 'company',
						displayName: 'Company',
						values: [
							{ displayName: 'Domain', name: 'domain', type: 'string', default: '', placeholder: 'acme.com' },
							{ displayName: 'Company Name', name: 'name', type: 'string', default: '', placeholder: 'Acme Inc' },
							{ displayName: 'LinkedIn URL', name: 'linkedinUrl', type: 'string', default: '', placeholder: 'https://www.linkedin.com/company/acme' },
							{ displayName: 'Lusha ID', name: 'lushaId', type: 'string', default: '', description: 'Lusha entity ID from a previous search or enrich result' },
							{ displayName: 'Client Reference ID', name: 'clientReferenceId', type: 'string', default: '', description: 'Your own reference ID, returned in the response for correlation' },
						],
					},
				],
			},

			// ===== PAGINATION FIELDS (CONTACT & COMPANY SEARCH) =====
			{
				displayName: 'Additional Options',
				name: 'searchAdditionalOptions',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: {
					show: {
						resource: ['contact', 'company'],
						operation: ['prospectingContacts', 'prospectingCompanies'],
					},
				},
				options: [
					{
						displayName: 'Page',
						name: 'page',
						type: 'number',
						default: 0,
						description: 'Page number for pagination (starts at 0)',
					},
					{
						displayName: 'Page Size',
						name: 'pageSize',
						type: 'number',
						default: 50,
						description: 'Number of results per page (max 50)',
					},
					{
						displayName: 'Search Text',
						name: 'searchText',
						type: 'string',
						default: '',
						description: 'Free-text relevance hint layered on top of structured filters. Not an exact match — prefer structured filters for precision. Applies to Contact Search only.',
						placeholder: 'sales automation SaaS',
					},
					{
						displayName: 'Signal Types',
						name: 'signalNames',
						type: 'multiOptions',
						options: [
							{ name: 'All Signals', value: 'allSignals' },
							{ name: 'Promotion', value: 'promotion' },
							{ name: 'Company Change', value: 'companyChange' },
						],
						default: [],
						description: 'Narrow results to contacts with recent signal activity (charges extra credits per signal type). Applies to Contact Search only.',
					},
					{
						displayName: 'Signal Start Date',
						name: 'signalStartDate',
						type: 'string',
						default: '',
						description: 'Only include signals on or after this date (YYYY-MM-DD). Defaults to last 6 months when blank. Applies to Contact Search only.',
						placeholder: '2025-01-01',
					},
				],
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
						prtnr: 'n8n_connector-prod',
					},
					qs: {},
					body: {},
					json: true,
					returnFullResponse: false,
				};

				// ===================== CONTACT OPERATIONS =====================
				if (resource === 'contact') {
					switch (operation) {
						case 'searchContacts': {
							// POST /v3/contacts/search — identifier-based lookup
							requestOptions.url = '/v3/contacts/search';
							requestOptions.method = 'POST';
							if (!requestOptions.headers) requestOptions.headers = {};
							requestOptions.headers['Content-Type'] = 'application/json';
							delete requestOptions.qs;

							const contactInputMode = this.getNodeParameter('searchContactsInputMode', i, 'simple') as string;
							const contacts: IDataObject[] = [];
							let refCounter = 1;

							if (contactInputMode === 'simple') {
								const emailsRaw = this.getNodeParameter('searchContactsEmails', i, '') as string;
								const linkedinRaw = this.getNodeParameter('searchContactsLinkedinUrls', i, '') as string;
								const lushaIdsRaw = this.getNodeParameter('searchContactsLushaIds', i, '') as string;

								emailsRaw.split(',').map(s => s.trim()).filter(s => s).forEach(email => {
									contacts.push({ clientReferenceId: String(refCounter++), email });
								});
								linkedinRaw.split(',').map(s => s.trim()).filter(s => s).forEach(linkedinUrl => {
									contacts.push({ clientReferenceId: String(refCounter++), linkedinUrl });
								});
								lushaIdsRaw.split(',').map(s => s.trim()).filter(s => s).forEach(id => {
									contacts.push({ clientReferenceId: String(refCounter++), id });
								});
							} else {
								const contactsList = this.getNodeParameter('searchContactsList', i, { contact: [] }) as IDataObject;
								const contactEntries = (contactsList.contact as IDataObject[]) ?? [];
								contactEntries.forEach((entry) => {
									const emails = entry.email ? String(entry.email).split(',').map((s: string) => s.trim()).filter((s: string) => s) : [];
									const linkedinUrls = entry.linkedinUrl ? String(entry.linkedinUrl).split(',').map((s: string) => s.trim()).filter((s: string) => s) : [];
									const ids = entry.id ? String(entry.id).split(',').map((s: string) => s.trim()).filter((s: string) => s) : [];

									if (emails.length > 1) {
										emails.forEach((email: string) => contacts.push({ clientReferenceId: String(refCounter++), email }));
									} else if (linkedinUrls.length > 1) {
										linkedinUrls.forEach((linkedinUrl: string) => contacts.push({ clientReferenceId: String(refCounter++), linkedinUrl }));
									} else if (ids.length > 1) {
										ids.forEach((id: string) => contacts.push({ clientReferenceId: String(refCounter++), id }));
									} else {
										const c: IDataObject = {};
										if (entry.clientReferenceId) c.clientReferenceId = entry.clientReferenceId;
										else c.clientReferenceId = String(refCounter++);
										if (entry.id) c.id = String(entry.id).trim();
										if (entry.linkedinUrl) c.linkedinUrl = String(entry.linkedinUrl).trim();
										if (entry.email) c.email = String(entry.email).trim();
										if (entry.firstName) c.firstName = entry.firstName;
										if (entry.lastName) c.lastName = entry.lastName;
										if (entry.companyName) c.companyName = entry.companyName;
										if (entry.companyDomain) c.companyDomain = entry.companyDomain;
										if (Object.keys(c).length > 1) contacts.push(c);
									}
								});
							}

							if (contacts.length === 0) throw new Error('Search Contacts: provide at least one Email, LinkedIn URL, or Lusha ID.');

							const searchContactsBody: IDataObject = { contacts };

							const searchContactsOptions = this.getNodeParameter('searchContactsOptions', i, {}) as IDataObject;
							if (searchContactsOptions.includePartialProfiles) {
								searchContactsBody.options = { includePartialProfiles: true };
							}

							const contactSignalTypes = (searchContactsOptions.signalTypes as string[]) ?? [];
							if (contactSignalTypes.length) {
								const signalFilter: IDataObject = { types: contactSignalTypes };
								if (searchContactsOptions.signalStartDate) signalFilter.startDate = searchContactsOptions.signalStartDate;
								if (searchContactsOptions.maxResultsPerSignal) signalFilter.maxResultsPerSignal = searchContactsOptions.maxResultsPerSignal;
								searchContactsBody.signals = signalFilter;
							}

							requestOptions.body = searchContactsBody;
							break;
						}

						case 'prospectingContacts': {
							// POST /v3/contacts/prospecting — filter-based ICP discovery
							requestOptions.url = '/v3/contacts/prospecting';
							requestOptions.method = 'POST';
							if (!requestOptions.headers) requestOptions.headers = {};
							requestOptions.headers['Content-Type'] = 'application/json';
							delete requestOptions.qs;

							const page = this.getNodeParameter('searchAdditionalOptions.page', i, 0) as number;
							const pageSize = this.getNodeParameter('searchAdditionalOptions.pageSize', i, 50) as number;

							const contactSearchBody: IDataObject = {
								pagination: {
									page,
									size: Math.min(pageSize, 50),
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

							// Add seniorities (seniorityIds = array of numbers)
							const seniorities = this.getNodeParameter('seniorities', i, []) as number[];
							if (seniorities.length) {
								const contactInclude = ((contactSearchBody.filters as IDataObject)
									.contacts as IDataObject).include as IDataObject;
								contactInclude.seniorityIds = seniorities;
							}

							// Add contact countries
							const countries = this.getNodeParameter('countries', i, []) as string[];
							if (countries.length) {
								const contactInclude = ((contactSearchBody.filters as IDataObject)
									.contacts as IDataObject).include as IDataObject;
								contactInclude.countries = countries;
							}

							// Add contact locations (state / city)
							const states = this.getNodeParameter('contactSearchFilters.states', i, '') as string;
							const cities = this.getNodeParameter('contactSearchFilters.cities', i, '') as string;
							const locations: IDataObject[] = [];

							if (states) {
								states.split(',').map((s) => s.trim()).filter((s) => s).forEach((state) => {
									locations.push({ state });
								});
							}
							if (cities) {
								cities.split(',').map((c) => c.trim()).filter((c) => c).forEach((city) => {
									locations.push({ city });
								});
							}
							if (locations.length) {
								const contactInclude = ((contactSearchBody.filters as IDataObject)
									.contacts as IDataObject).include as IDataObject;
								contactInclude.locations = locations;
							}

							// Add existing data points
							const existingDataPoints = this.getNodeParameter('contactSearchFilters.existingDataPoints', i, []) as string[];
							if (existingDataPoints.length) {
								const contactInclude = ((contactSearchBody.filters as IDataObject)
									.contacts as IDataObject).include as IDataObject;
								contactInclude.existingDataPoints = existingDataPoints;
							}

							// Add company filters (names/domains)
							const companyDomains = this.getNodeParameter('contactSearchFilters.companyDomains', i, '') as string;
							if (companyDomains) {
								const companiesInclude = ((contactSearchBody.filters as IDataObject)
									.companies as IDataObject).include as IDataObject;
								const companyList = companyDomains.split(',').map((c) => c.trim()).filter((c) => c);
								const domains = companyList.filter((c) => c.includes('.'));
								const names = companyList.filter((c) => !c.includes('.'));
								if (domains.length) companiesInclude.domains = domains;
								if (names.length) companiesInclude.names = names;
							}

							// Add company industry filters
							const companyIndustries = this.getNodeParameter('contactSearchFilters.contactSearchCompanyMainIndustries', i, []) as string[];
							if (companyIndustries.length) {
								const companiesInclude = ((contactSearchBody.filters as IDataObject)
									.companies as IDataObject).include as IDataObject;
								companiesInclude.mainIndustriesIds = companyIndustries.map((id: string) => parseInt(id, 10));
							}

							// Add company sub-industry filters
							const companySubIndustries = this.getNodeParameter('contactSearchFilters.contactSearchCompanySubIndustries', i, []) as string[];
							if (companySubIndustries.length) {
								const companiesInclude = ((contactSearchBody.filters as IDataObject)
									.companies as IDataObject).include as IDataObject;
								companiesInclude.subIndustriesIds = companySubIndustries.map((id: string) => parseInt(id, 10));
							}

							// Handle employee count min/max
							const employeeMin = this.getNodeParameter('contactSearchFilters.contactSearchCompanyEmployeeMin', i, '') as string;
							const employeeMax = this.getNodeParameter('contactSearchFilters.contactSearchCompanyEmployeeMax', i, '') as string;
							if (employeeMin || employeeMax) {
								const companiesInclude = ((contactSearchBody.filters as IDataObject)
									.companies as IDataObject).include as IDataObject;
								const min = employeeMin ? parseInt(employeeMin, 10) : 1;
								const max = employeeMax ? parseInt(employeeMax, 10) : 999999;
								companiesInclude.sizes = [{ min, max }];
							}

							// Add company revenue filters
							const companyRevenueMin = this.getNodeParameter('contactSearchFilters.contactSearchCompanyRevenueMin', i, '') as string;
							const companyRevenueMax = this.getNodeParameter('contactSearchFilters.contactSearchCompanyRevenueMax', i, '') as string;
							if (companyRevenueMin || companyRevenueMax) {
								const companiesInclude = ((contactSearchBody.filters as IDataObject)
									.companies as IDataObject).include as IDataObject;
								companiesInclude.revenues = [{
									min: companyRevenueMin ? parseInt(companyRevenueMin) : 0,
									max: companyRevenueMax ? parseInt(companyRevenueMax) : 999999999999,
								}];
							}

							// Add company countries
							const companyCountries = this.getNodeParameter('contactSearchFilters.contactSearchCompanyCountries', i, []) as string[];
							if (companyCountries.length) {
								const companiesInclude = ((contactSearchBody.filters as IDataObject)
									.companies as IDataObject).include as IDataObject;
								companiesInclude.countries = companyCountries;
							}

							// Add company locations
							const companyStates = this.getNodeParameter('contactSearchFilters.contactSearchCompanyStates', i, '') as string;
							const companyCities = this.getNodeParameter('contactSearchFilters.contactSearchCompanyCities', i, '') as string;
							const companyLocations: IDataObject[] = [];
							if (companyStates) {
								companyStates.split(',').map((s) => s.trim()).filter((s) => s).forEach((state) => {
									companyLocations.push({ state });
								});
							}
							if (companyCities) {
								companyCities.split(',').map((c) => c.trim()).filter((c) => c).forEach((city) => {
									companyLocations.push({ city });
								});
							}
							if (companyLocations.length) {
								const companiesInclude = ((contactSearchBody.filters as IDataObject)
									.companies as IDataObject).include as IDataObject;
								companiesInclude.locations = companyLocations;
							}

							// Add technologies
							const technologies = this.getNodeParameter('contactSearchFilters.contactSearchTechnologies', i, '') as string;
							if (technologies) {
								const techList = technologies.split(',').map((t) => t.trim()).filter((t) => t);
								if (techList.length) {
									const companiesInclude = ((contactSearchBody.filters as IDataObject)
										.companies as IDataObject).include as IDataObject;
									companiesInclude.technologies = techList;
								}
							}

							// Add intent topics
							const intentTopics = this.getNodeParameter('contactSearchFilters.contactSearchIntentTopics', i, '') as string;
							if (intentTopics) {
								const topicList = intentTopics.split(',').map((t) => t.trim()).filter((t) => t);
								if (topicList.length) {
									const companiesInclude = ((contactSearchBody.filters as IDataObject)
										.companies as IDataObject).include as IDataObject;
									companiesInclude.intentTopics = topicList;
								}
							}

							// Add NAICS codes
							const naicsCodes = this.getNodeParameter('contactSearchFilters.contactSearchNaicsCodes', i, '') as string;
							if (naicsCodes) {
								const naicsList = naicsCodes.split(',').map((c) => c.trim()).filter((c) => c);
								if (naicsList.length) {
									const companiesInclude = ((contactSearchBody.filters as IDataObject)
										.companies as IDataObject).include as IDataObject;
									companiesInclude.naicsCodes = naicsList;
								}
							}

							// Add SIC codes
							const sicsCodes = this.getNodeParameter('contactSearchFilters.contactSearchSicsCodes', i, '') as string;
							if (sicsCodes) {
								const sicsList = sicsCodes.split(',').map((c) => c.trim()).filter((c) => c);
								if (sicsList.length) {
									const companiesInclude = ((contactSearchBody.filters as IDataObject)
										.companies as IDataObject).include as IDataObject;
									companiesInclude.sicsCodes = sicsList;
								}
							}

							// Add searchText
							const searchText = this.getNodeParameter('searchAdditionalOptions.searchText', i, '') as string;
							if (searchText) {
								(contactSearchBody as IDataObject).searchText = searchText;
							}

							// Add signals
							const signalNames = this.getNodeParameter('searchAdditionalOptions.signalNames', i, []) as string[];
							if (signalNames.length) {
								const signalStartDate = this.getNodeParameter('searchAdditionalOptions.signalStartDate', i, '') as string;
								const signalFilter: IDataObject = { types: signalNames };
								if (signalStartDate) signalFilter.startDate = signalStartDate;
								(contactSearchBody as IDataObject).signals = signalFilter;
							}

							requestOptions.body = contactSearchBody;
							break;
						}

						case 'enrichFromSearch': {
							const inputData = items[i];
							const searchData = inputData.json;

							const selectionType = this.getNodeParameter('contactSelectionType', i, 'all') as string;
							let contactIds: string[] = [];

							if (selectionType === 'all') {
								if (searchData.allContactIds && Array.isArray(searchData.allContactIds)) {
									contactIds = searchData.allContactIds as string[];
								} else {
									const items: any[] = (searchData.results ?? searchData.data ?? []) as any[];
									contactIds = items.map((c: any) => c.id || c.contactId).filter(Boolean);
								}
							} else if (selectionType === 'new') {
								if (searchData.newContactIds && Array.isArray(searchData.newContactIds)) {
									contactIds = searchData.newContactIds as string[];
								} else {
									const items: any[] = (searchData.results ?? searchData.data ?? []) as any[];
									contactIds = items
										.filter((c: any) => Array.isArray(c.canReveal) && c.canReveal.length > 0)
										.map((c: any) => c.id || c.contactId)
										.filter(Boolean);
								}
							} else if (selectionType === 'specific') {
								const idsInput = this.getNodeParameter('contactIds', i, '') as string;
								contactIds = idsInput.split(',').map((id) => id.trim()).filter(Boolean);
							}

							if (!contactIds.length) {
								throw new Error('No contact IDs found. Ensure the search operation returned results.');
							}

							requestOptions.url = '/v3/contacts/enrich';
							requestOptions.method = 'POST';
							if (!requestOptions.headers) requestOptions.headers = {};
							requestOptions.headers['Content-Type'] = 'application/json';
							delete requestOptions.qs;

							requestOptions.body = { ids: contactIds, reveal: ['emails', 'phones'] };
							break;
						}

						case 'enrichBulk': {
							requestOptions.url = '/v3/contacts/search-and-enrich';
							requestOptions.method = 'POST';
							if (!requestOptions.headers) requestOptions.headers = {};
							requestOptions.headers['Content-Type'] = 'application/json';
							delete requestOptions.qs;

							const bulkType = this.getNodeParameter('bulkType', i, 'emailList') as string;

							if (bulkType === 'emailList') {
								const emailListRaw = this.getNodeParameter('bulkEmailList', i, '') as string;
								const emails = emailListRaw
									.split(',')
									.map((e) => e.trim())
									.filter((e) => e);
								if (emails.length === 0) throw new Error('Email Addresses field is empty.');
								const contacts = emails.map((email, idx) => ({
									clientReferenceId: String(idx + 1),
									email,
								}));
								const bulkRevealEmails = this.getNodeParameter('contactBulkAdditionalOptions.bulkRevealEmails', i, false) as boolean;
								const bulkRevealPhones = this.getNodeParameter('contactBulkAdditionalOptions.bulkRevealPhones', i, false) as boolean;
								const bulkFilterByEmail = this.getNodeParameter('contactBulkAdditionalOptions.bulkFilterBy', i, '') as string;
								const reveal: string[] = [];
								if (bulkRevealEmails) reveal.push('emails');
								if (bulkRevealPhones) reveal.push('phones');
								if (reveal.length === 0) reveal.push('emails', 'phones');
								const emailListBody: IDataObject = { contacts, reveal };
								if (bulkFilterByEmail) emailListBody.filterBy = bulkFilterByEmail;
								requestOptions.body = emailListBody;
							} else if (bulkType === 'simple') {
								const contactsList = this.getNodeParameter('contactsList', i, {}) as IDataObject;
								const contacts: IDataObject[] = [];

								if (contactsList.contact && Array.isArray(contactsList.contact)) {
									(contactsList.contact as IDataObject[]).forEach((contact) => {
										const splitVals = (v: any) => v ? String(v).split(',').map((s: string) => s.trim()).filter((s: string) => s) : [];
										const emails = splitVals(contact.email);
										const linkedinUrls = splitVals(contact.linkedinUrl);
										if (emails.length > 1) {
											emails.forEach((email: string) => contacts.push({ clientReferenceId: String(contacts.length + 1), email }));
										} else if (linkedinUrls.length > 1) {
											linkedinUrls.forEach((linkedinUrl: string) => contacts.push({ clientReferenceId: String(contacts.length + 1), linkedinUrl }));
										} else {
											const contactData: IDataObject = { clientReferenceId: String(contacts.length + 1) };
											if (contact.email) contactData.email = String(contact.email).trim();
											else if (contact.linkedinUrl) contactData.linkedinUrl = String(contact.linkedinUrl).trim();
											else if (contact.fullName) {
												const nameParts = (contact.fullName as string).trim().split(' ');
												contactData.firstName = nameParts[0] ?? '';
												contactData.lastName = nameParts.slice(1).join(' ') || '';
												if (contact.companyDomain) contactData.companyDomain = contact.companyDomain;
												else if (contact.companyName) contactData.companyName = contact.companyName;
											}
											if (Object.keys(contactData).length > 1) contacts.push(contactData);
										}
									});
								}

								const bulkRevealEmails = this.getNodeParameter(
									'contactBulkAdditionalOptions.bulkRevealEmails',
									i,
									false,
								) as boolean;

								const bulkRevealPhones = this.getNodeParameter(
									'contactBulkAdditionalOptions.bulkRevealPhones',
									i,
									false,
								) as boolean;

								const bulkFilterBySimple = this.getNodeParameter(
									'contactBulkAdditionalOptions.bulkFilterBy',
									i,
									'',
								) as string;

								const reveal: string[] = [];
								if (bulkRevealEmails) reveal.push('emails');
								if (bulkRevealPhones) reveal.push('phones');
								if (reveal.length === 0) reveal.push('emails', 'phones');

								const simpleBody: IDataObject = { contacts, reveal };
								if (bulkFilterBySimple) simpleBody.filterBy = bulkFilterBySimple;
								requestOptions.body = simpleBody;
							} else {
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
					case 'searchAndEnrich': {
							requestOptions.url = '/v3/contacts/search-and-enrich';
							requestOptions.method = 'POST';
							if (!requestOptions.headers) requestOptions.headers = {};
							requestOptions.headers['Content-Type'] = 'application/json';
							delete requestOptions.qs;

							const seContacts = this.getNodeParameter('searchAndEnrichContacts', i, {}) as IDataObject;
							const seContactList: IDataObject[] = [];

							if (seContacts.contact && Array.isArray(seContacts.contact)) {
								(seContacts.contact as IDataObject[]).forEach((item) => {
									const splitVals = (v: any) => v ? String(v).split(',').map((s: string) => s.trim()).filter((s: string) => s) : [];
									const emails = splitVals(item.email);
									const linkedinUrls = splitVals(item.linkedinUrl);
									const lushaIds = splitVals(item.lushaId);
									if (emails.length > 1) {
										emails.forEach((email: string) => seContactList.push({ clientReferenceId: String(seContactList.length + 1), email }));
									} else if (linkedinUrls.length > 1) {
										linkedinUrls.forEach((linkedinUrl: string) => seContactList.push({ clientReferenceId: String(seContactList.length + 1), linkedinUrl }));
									} else if (lushaIds.length > 1) {
										lushaIds.forEach((id: string) => seContactList.push({ clientReferenceId: String(seContactList.length + 1), id }));
									} else {
										const entry: IDataObject = { clientReferenceId: item.clientReferenceId ? item.clientReferenceId : String(seContactList.length + 1) };
										if (item.lushaId) entry.id = String(item.lushaId).trim();
										else if (item.email) entry.email = String(item.email).trim();
										else if (item.linkedinUrl) entry.linkedinUrl = String(item.linkedinUrl).trim();
										else {
											if (item.firstName) entry.firstName = item.firstName;
											if (item.lastName) entry.lastName = item.lastName;
											if (item.companyDomain) entry.companyDomain = item.companyDomain;
											else if (item.companyName) entry.companyName = item.companyName;
										}
										seContactList.push(entry);
									}
								});
							}

							if (seContactList.length === 0) throw new Error('Add at least one contact to the Contacts list.');

							const seReveal = this.getNodeParameter('searchAndEnrichReveal', i, ['emails', 'phones']) as string[];
							if (seReveal.length === 0) seReveal.push('emails', 'phones');

							requestOptions.body = { contacts: seContactList, reveal: seReveal };
							break;
						}
					case 'searchLookalikes': {
							requestOptions.url = '/v3/contacts/lookalike';
							requestOptions.method = 'POST';
							if (!requestOptions.headers) requestOptions.headers = {};
							requestOptions.headers['Content-Type'] = 'application/json';
							delete requestOptions.qs;

							const seedType = this.getNodeParameter('contactLookalikeSeedType', i, 'emails') as string;
							const seedsCollection = this.getNodeParameter('contactLookalikeSeeds', i, {}) as IDataObject;
							const seedItems = (seedsCollection.seed as IDataObject[] | undefined) ?? [];
							const limit = this.getNodeParameter('contactLookalikeLimit', i, 25) as number;
							const dedupeSessionId = this.getNodeParameter('contactLookalikeOptions.dedupeSessionId', i, '') as string;
							const excludeEmails = this.getNodeParameter('contactLookalikeOptions.excludeEmails', i, '') as string;

							const splitSeedVals = (items: IDataObject[]) =>
								items.flatMap((s: any) => s.value ? String(s.value).split(',').map((v: string) => v.trim()).filter((v: string) => v) : []);

							const seeds: IDataObject = {};
							if (seedType === 'emails') {
								seeds.emails = splitSeedVals(seedItems);
							} else if (seedType === 'linkedinUrls') {
								seeds.linkedinUrls = splitSeedVals(seedItems);
							} else if (seedType === 'contactIds') {
								seeds.contactIds = splitSeedVals(seedItems).map(Number).filter(Boolean);
							} else if (seedType === 'nameAndCompany') {
								seeds.contacts = seedItems
									.filter((s: any) => s.firstName || s.lastName)
									.map((s: any) => {
										const c: IDataObject = {
											firstName: s.firstName ?? '',
											lastName: s.lastName ?? '',
										};
										if (s.companyDomain) c.companyDomain = s.companyDomain;
										else if (s.companyName) c.companyName = s.companyName;
										return c;
									});
							}

							const body: IDataObject = { seeds, limit };
							if (dedupeSessionId) body.dedupeSessionId = dedupeSessionId;
							if (excludeEmails) {
								body.exclude = {
									emails: excludeEmails.split(',').map((e: string) => e.trim()).filter(Boolean),
								};
							}

							requestOptions.body = body;
							break;
						}
					}
				}

				// ===================== COMPANY OPERATIONS =====================
				if (resource === 'company') {
					switch (operation) {
						case 'searchCompanies': {
							// POST /v3/companies/search — identifier-based lookup
							requestOptions.url = '/v3/companies/search';
							requestOptions.method = 'POST';
							if (!requestOptions.headers) requestOptions.headers = {};
							requestOptions.headers['Content-Type'] = 'application/json';
							delete requestOptions.qs;

							const companyInputMode = this.getNodeParameter('searchCompaniesInputMode', i, 'simple') as string;
							const companiesArr: IDataObject[] = [];
							let compRefCounter = 1;

							if (companyInputMode === 'simple') {
								const simpleInput = this.getNodeParameter('searchCompaniesSimpleInput', i, '') as string;
								simpleInput.split(',').map(s => s.trim()).filter(s => s).forEach(val => {
									const c: IDataObject = { clientReferenceId: String(compRefCounter++) };
									if (/^\d+$/.test(val)) {
										c.id = val;
									} else if (val.includes('.')) {
										c.domain = val;
									} else {
										c.name = val;
									}
									companiesArr.push(c);
								});
							} else {
								const companiesList = this.getNodeParameter('searchCompaniesList', i, { company: [] }) as IDataObject;
								const companyEntries = (companiesList.company as IDataObject[]) ?? [];
								companyEntries.forEach((entry) => {
									// If domain contains commas, split into multiple entries
									const domains = entry.domain ? String(entry.domain).split(',').map((s: string) => s.trim()).filter((s: string) => s) : [];
									const names = entry.name ? String(entry.name).split(',').map((s: string) => s.trim()).filter((s: string) => s) : [];
									const ids = entry.id ? String(entry.id).split(',').map((s: string) => s.trim()).filter((s: string) => s) : [];

									if (domains.length > 1) {
										domains.forEach((domain: string) => {
											companiesArr.push({ clientReferenceId: String(compRefCounter++), domain });
										});
									} else if (names.length > 1) {
										names.forEach((name: string) => {
											companiesArr.push({ clientReferenceId: String(compRefCounter++), name });
										});
									} else if (ids.length > 1) {
										ids.forEach((id: string) => {
											companiesArr.push({ clientReferenceId: String(compRefCounter++), id });
										});
									} else {
										const c: IDataObject = {};
										if (entry.clientReferenceId) c.clientReferenceId = entry.clientReferenceId;
										else c.clientReferenceId = String(compRefCounter++);
										if (entry.id) c.id = String(entry.id).trim();
										if (entry.name) c.name = String(entry.name).trim();
										if (entry.domain) c.domain = String(entry.domain).trim();
										if (Object.keys(c).length > 1) companiesArr.push(c);
									}
								});
							}

							const searchCompaniesBody: IDataObject = { companies: companiesArr };

							const searchCompaniesOptions = this.getNodeParameter('searchCompaniesOptions', i, {}) as IDataObject;
							if (searchCompaniesOptions.includePartialProfiles) {
								searchCompaniesBody.options = { includePartialProfiles: true };
							}

							const companySignalTypes = (searchCompaniesOptions.signalTypes as string[]) ?? [];
							if (companySignalTypes.length) {
								const signalFilter: IDataObject = { types: companySignalTypes };
								if (searchCompaniesOptions.signalStartDate) signalFilter.startDate = searchCompaniesOptions.signalStartDate;
								if (searchCompaniesOptions.maxResultsPerSignal) signalFilter.maxResultsPerSignal = searchCompaniesOptions.maxResultsPerSignal;
								searchCompaniesBody.signals = signalFilter;
							}

							requestOptions.body = searchCompaniesBody;
							break;
						}

						case 'prospectingCompanies': {
							// POST /v3/companies/prospecting — filter-based ICP discovery
							requestOptions.url = '/v3/companies/prospecting';
							requestOptions.method = 'POST';
							if (!requestOptions.headers) requestOptions.headers = {};
							requestOptions.headers['Content-Type'] = 'application/json';
							delete requestOptions.qs;

							const page = this.getNodeParameter('searchAdditionalOptions.page', i, 0) as number;
							const pageSize = this.getNodeParameter('searchAdditionalOptions.pageSize', i, 50) as number;

							const companySearchBody: IDataObject = {
								pagination: {
									page,
									size: Math.min(pageSize, 50),
								},
								filters: {
									companies: { include: {} },
								},
							};

							const filters = companySearchBody.filters as IDataObject;
							const companies = filters.companies as IDataObject;
							const companiesInclude = companies.include as IDataObject;

							// Names / domains
							const searchCompanyDomains = this.getNodeParameter('searchCompanyDomains', i, '') as string;
							if (searchCompanyDomains) {
								const companyList = searchCompanyDomains.split(',').map((c) => c.trim()).filter((c) => c);
								const domains = companyList.filter((c) => c.includes('.'));
								const names = companyList.filter((c) => !c.includes('.'));
								if (domains.length) companiesInclude.domains = domains;
								if (names.length) companiesInclude.names = names;
							}

							// Company countries / states / cities => locations[]
							const companyCountries = this.getNodeParameter('companyCountries', i, []) as string[];
							const companyStates = this.getNodeParameter('companySearchFilters.companyStates', i, '') as string;
							const companyCities = this.getNodeParameter('companySearchFilters.companyCities', i, '') as string;

							const companyLocations: IDataObject[] = [];
							if (companyCountries.length) {
								companyCountries.forEach((country) => companyLocations.push({ country }));
							}
							if (companyStates) {
								companyStates.split(',').map((s) => s.trim()).filter((s) => s).forEach((state) => companyLocations.push({ state }));
							}
							if (companyCities) {
								companyCities.split(',').map((c) => c.trim()).filter((c) => c).forEach((city) => companyLocations.push({ city }));
							}
							if (companyLocations.length) {
								companiesInclude.locations = companyLocations;
							}

							// Employee count min/max
							const employeeMin = this.getNodeParameter('companySearchFilters.companyEmployeeMin', i, '') as string;
							const employeeMax = this.getNodeParameter('companySearchFilters.companyEmployeeMax', i, '') as string;
							if (employeeMin || employeeMax) {
								const min = employeeMin ? parseInt(employeeMin) : 1;
								const max = employeeMax ? parseInt(employeeMax) : 999999;
								companiesInclude.sizes = [{ min, max }];
							}

							// Main industry IDs
							const companyMainIndustryIds = this.getNodeParameter('companySearchFilters.companyMainIndustryIds', i, []) as string[];
							if (companyMainIndustryIds.length) {
								companiesInclude.mainIndustriesIds = companyMainIndustryIds.map((id: string) => parseInt(id, 10));
							}

							// Sub-industry IDs
							const companySubIndustryIds = this.getNodeParameter('companySearchFilters.companySubIndustryIds', i, []) as string[];
							if (companySubIndustryIds.length) {
								companiesInclude.subIndustriesIds = companySubIndustryIds.map((id: string) => parseInt(id, 10));
							}

							// Revenue min / max
							const companyRevenueMin = this.getNodeParameter('companySearchFilters.companyRevenueMin', i, '') as string;
							const companyRevenueMax = this.getNodeParameter('companySearchFilters.companyRevenueMax', i, '') as string;
							if (companyRevenueMin || companyRevenueMax) {
								companiesInclude.revenues = [{
									min: companyRevenueMin ? parseInt(companyRevenueMin) : 0,
									max: companyRevenueMax ? parseInt(companyRevenueMax) : 999999999999,
								}];
							}

							requestOptions.body = companySearchBody;
							break;
						}

						case 'enrichFromSearch': {
							const inputData = items[i];
							const searchData = inputData.json;

							const selectionType = this.getNodeParameter('companySelectionType', i, 'all') as string;
							let companiesIds: string[] = [];

							if (selectionType === 'all') {
								if (searchData.allCompanyIds && Array.isArray(searchData.allCompanyIds)) {
									companiesIds = searchData.allCompanyIds as string[];
								} else if (searchData.data && Array.isArray(searchData.data)) {
									companiesIds = (searchData.data as any[]).map((c: any) => c.id || c.companyId || '').filter(Boolean);
								} else {
									const allInputItems = this.getInputData();
									companiesIds = allInputItems
										.map(item => String(item.json.id || item.json.companyId || item.json.company_id || ''))
										.filter(Boolean);
								}
							} else if (selectionType === 'specific') {
								const idsInput = this.getNodeParameter('companyIds', i, '') as string;
								companiesIds = idsInput.split(',').map((id) => id.trim()).filter(Boolean);
							}

							if (!companiesIds.length) {
								throw new Error('No company IDs found. Ensure the search operation returned results or provide company IDs.');
							}

							requestOptions.url = '/v3/companies/enrich';
							requestOptions.method = 'POST';
							if (!requestOptions.headers) requestOptions.headers = {};
							requestOptions.headers['Content-Type'] = 'application/json';
							delete requestOptions.qs;

							requestOptions.body = { ids: companiesIds };
							break;
						}

						case 'enrichBulk': {
							requestOptions.url = '/v3/companies/search-and-enrich';
							requestOptions.method = 'POST';
							if (!requestOptions.headers) requestOptions.headers = {};
							requestOptions.headers['Content-Type'] = 'application/json';
							delete requestOptions.qs;

							const bulkType = this.getNodeParameter('companyBulkType', i, 'simple') as string;

							if (bulkType === 'simple') {
								const companiesList = this.getNodeParameter('companiesList', i, {}) as IDataObject;
								const companies: IDataObject[] = [];

								if (companiesList.company && Array.isArray(companiesList.company)) {
									(companiesList.company as IDataObject[]).forEach((company) => {
										const splitVals = (v: any) => v ? String(v).split(',').map((s: string) => s.trim()).filter((s: string) => s) : [];
										const domains = splitVals(company.domain);
										const names = splitVals(company.name);
										if (domains.length > 1) {
											domains.forEach((domain: string) => companies.push({ clientReferenceId: String(companies.length + 1), domain }));
										} else if (names.length > 1) {
											names.forEach((name: string) => companies.push({ clientReferenceId: String(companies.length + 1), name }));
										} else {
											const companyData: IDataObject = { clientReferenceId: String(companies.length + 1) };
											if (company.domain) companyData.domain = String(company.domain).trim();
											if (company.name) companyData.name = String(company.name).trim();
											if (Object.keys(companyData).length > 1) companies.push(companyData);
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
					case 'searchAndEnrich': {
							requestOptions.url = '/v3/companies/search-and-enrich';
							requestOptions.method = 'POST';
							if (!requestOptions.headers) requestOptions.headers = {};
							requestOptions.headers['Content-Type'] = 'application/json';
							delete requestOptions.qs;

							const seCompanies = this.getNodeParameter('searchAndEnrichCompanies', i, {}) as IDataObject;
							const seCompanyList: IDataObject[] = [];

							if (seCompanies.company && Array.isArray(seCompanies.company)) {
								(seCompanies.company as IDataObject[]).forEach((item) => {
									const splitVals = (v: any) => v ? String(v).split(',').map((s: string) => s.trim()).filter((s: string) => s) : [];
									const domains = splitVals(item.domain);
									const names = splitVals(item.name);
									const lushaIds = splitVals(item.lushaId);
									if (domains.length > 1) {
										domains.forEach((domain: string) => seCompanyList.push({ clientReferenceId: String(seCompanyList.length + 1), domain }));
									} else if (names.length > 1) {
										names.forEach((name: string) => seCompanyList.push({ clientReferenceId: String(seCompanyList.length + 1), name }));
									} else if (lushaIds.length > 1) {
										lushaIds.forEach((id: string) => seCompanyList.push({ clientReferenceId: String(seCompanyList.length + 1), id }));
									} else {
										const entry: IDataObject = { clientReferenceId: item.clientReferenceId ? item.clientReferenceId : String(seCompanyList.length + 1) };
										if (item.lushaId) entry.id = String(item.lushaId).trim();
										else if (item.domain) entry.domain = String(item.domain).trim();
										else if (item.linkedinUrl) entry.linkedinUrl = String(item.linkedinUrl).trim();
										else if (item.name) entry.name = String(item.name).trim();
										seCompanyList.push(entry);
									}
								});
							}

							if (seCompanyList.length === 0) throw new Error('Add at least one company to the Companies list.');

							requestOptions.body = { companies: seCompanyList };
							break;
						}
					case 'searchLookalikes': {
							requestOptions.url = '/v3/companies/lookalike';
							requestOptions.method = 'POST';
							if (!requestOptions.headers) requestOptions.headers = {};
							requestOptions.headers['Content-Type'] = 'application/json';
							delete requestOptions.qs;

							const companySeedType = this.getNodeParameter('companyLookalikeSeedType', i, 'domains') as string;
							const companySeedsCollection = this.getNodeParameter('companyLookalikeSeeds', i, {}) as IDataObject;
							const companySeedItems = (companySeedsCollection.seed as IDataObject[] | undefined) ?? [];
							const companyLimit = this.getNodeParameter('companyLookalikeLimit', i, 25) as number;
							const companyDedupeId = this.getNodeParameter('companyLookalikeOptions.dedupeSessionId', i, '') as string;
							const excludeDomains = this.getNodeParameter('companyLookalikeOptions.excludeDomains', i, '') as string;

							const splitCompanySeedVals = (items: IDataObject[]) =>
								items.flatMap((s: any) => s.value ? String(s.value).split(',').map((v: string) => v.trim()).filter((v: string) => v) : []);

							const companySeeds: IDataObject = {};
							if (companySeedType === 'domains') {
								companySeeds.domains = splitCompanySeedVals(companySeedItems);
							} else if (companySeedType === 'linkedinUrls') {
								companySeeds.linkedinUrls = splitCompanySeedVals(companySeedItems);
							}

							const companyBody: IDataObject = { seeds: companySeeds, limit: companyLimit };
							if (companyDedupeId) companyBody.dedupeSessionId = companyDedupeId;
							if (excludeDomains) {
								companyBody.exclude = {
									domains: excludeDomains.split(',').map((d: string) => d.trim()).filter(Boolean),
								};
							}

							requestOptions.body = companyBody;
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

				// ===================== HANDLE SEARCH RESULTS =====================
				if ((resource === 'contact' && (operation === 'searchContacts' || operation === 'prospectingContacts')) ||
					(resource === 'company' && (operation === 'searchCompanies' || operation === 'prospectingCompanies'))) {
					const searchResponse = response as any;
					
					// Add additional fields for easier workflow usage
					// v3 prospecting returns 'results' array (not 'data')
					const resultItems: any[] = searchResponse.results ?? searchResponse.data ?? [];
					if (Array.isArray(resultItems) && resultItems.length > 0) {
						if (resource === 'contact') {
							// Rebuild results so clientReferenceId is always the first key
							const enrichedResults = resultItems.map((item: any, idx: number) => ({
								clientReferenceId: item.clientReferenceId ?? String(idx + 1),
								...item,
							}));
							searchResponse.results = enrichedResults;

							const allContactIds = enrichedResults.map((item: any) => item.id || item.contactId).filter(Boolean);
							// v3 uses canReveal to indicate unrevealed contacts; fall back to all
							const newContactIds = enrichedResults
								.filter((item: any) => Array.isArray(item.canReveal) && item.canReveal.length > 0)
								.map((item: any) => item.id || item.contactId)
								.filter(Boolean);

							json = {
								...searchResponse,
								allContactIds,
								newContactIds,
								visibleContactIds: allContactIds,
							};
						} else {
							const allCompanyIds = resultItems.map((item: any) =>
								item.id || item.companyId || ''
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
				if ((error as any)?.response?.status === 451 || (error as any)?.statusCode === 451) {
					const gdprError = new Error('Request blocked (451): contact data is restricted in your region (GDPR).');
					if (this.continueOnFail()) {
						returnData.push({ json: { error: gdprError.message }, pairedItem: { item: i } });
						continue;
					}
					throw gdprError;
				}
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

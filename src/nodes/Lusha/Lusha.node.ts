import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
	IDataObject,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';
import {
	getMainIndustryOptions,
	getSubIndustryOptions,
	getContactCountryOptions,
	getCompanyCountryOptions,
	getDepartmentOptions,
	getSeniorityOptions,
} from './helpers/options';
import {
	contactAdvancedFilterOptions,
	companyAdvancedFilterOptions,
	applyContactAdvancedFilters,
	applyCompanyAdvancedFilters,
	geographicFilterProperties,
	applyGeographicFilters,
	fundingRowProperties,
	applyFundingRows,
} from './helpers/advanced-filters';

/**
 * Fetches one of Lusha's filter-discovery endpoints for a loadOptions dropdown.
 * Returns null on any failure — a missing credential or an unreachable catalog must
 * degrade to the generated static list rather than leaving the editor with an empty
 * dropdown and an error toast.
 */
async function fetchCatalog(ctx: ILoadOptionsFunctions, url: string): Promise<IDataObject[] | null> {
	try {
		const res = (await ctx.helpers.httpRequestWithAuthentication.call(ctx, 'lushaApi', {
			baseURL: 'https://api.lusha.com',
			url,
			method: 'GET',
			headers: { Accept: 'application/json', prtnr: 'n8n_connector-prod' },
			json: true,
		})) as IDataObject;
		const rows = Array.isArray(res)
			? res
			: ((res?.values ?? res?.data ?? res?.results) as IDataObject[] | undefined);
		return Array.isArray(rows) && rows.length ? rows : null;
	} catch (e) {
		return null;
	}
}

/** Our own casing for the seniority IDs, since the catalog returns lowercase names. */
const SENIORITY_LABELS: Record<string, string> = Object.fromEntries(
	getSeniorityOptions().map((o) => [String(o.value), String(o.name)]),
);

/** Fallback prettifier for a catalog label we do not already have casing for. */
function titleCaseLabel(raw: string): string {
	return raw
		.split(/([\s-])/)
		.map((part) => (/^[\s-]$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
		.join('');
}

/**
 * Optional tableId, accepted by enrich, prospecting and lookalike requests: results
 * are additionally persisted into an existing Lusha table. Omitted when blank.
 */
function withTableId(body: IDataObject, tableId: string): IDataObject {
	if (tableId) body.tableId = tableId;
	return body;
}

/** V3PaginationRequest.size accepts 10–100 (default 25). */
function clampPageSize(size: number): number {
	if (!Number.isFinite(size)) return 25;
	return Math.min(100, Math.max(10, Math.floor(size)));
}

/** V3PaginationRequest.page accepts 0–1000. */
function clampPage(page: number): number {
	if (!Number.isFinite(page)) return 0;
	return Math.min(1000, Math.max(0, Math.floor(page)));
}

/**
 * Drop `filters.<entity>.include` blocks that ended up empty so we never send
 * `{ include: {} }`, which carries no filter but still counts as a filter block.
 * Returns the number of populated include blocks left behind.
 */
function pruneEmptyFilterBlocks(filters: IDataObject): number {
	let populated = 0;
	for (const entity of Object.keys(filters)) {
		const block = filters[entity] as IDataObject | undefined;
		if (!block || typeof block !== 'object') {
			delete filters[entity];
			continue;
		}
		for (const direction of ['include', 'exclude']) {
			const criteria = block[direction] as IDataObject | undefined;
			if (criteria && typeof criteria === 'object' && Object.keys(criteria).length === 0) {
				delete block[direction];
			}
		}
		if (Object.keys(block).length === 0) delete filters[entity];
		else populated += 1;
	}
	return populated;
}

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
				typeOptions: { loadOptionsMethod: 'getDepartments' },
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
				typeOptions: { loadOptionsMethod: 'getSeniorities' },
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
				typeOptions: { loadOptionsMethod: 'getContactCountries' },
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
            // The filters catalog returns an empty list for this filter and the API
            // does not reject unknown values — it just matches nothing — so these
            // were confirmed empirically against the live API by checking that each
            // one narrows the result total rather than zeroing it. Note that the
            // OpenAPI description's own `work_phone` example is NOT a real value.
            options: [
                { name: 'Email (Any)', value: 'email' },
                { name: 'Work Email', value: 'work_email' },
                { name: 'Phone', value: 'phone' },
                { name: 'Mobile Phone', value: 'mobile_phone' },
                { name: 'Direct Phone', value: 'direct_phone' },
            ],
            default: [],
            description: 'Only return contacts that already have these data points. Combine several with the matching mode below.',
        },
        {
            displayName: 'Existing Data Points Match',
            name: 'existingDataPointsCondition',
            type: 'options',
            options: [
                { name: 'Any of them (OR)', value: 'or' },
                { name: 'All of them (AND)', value: 'and' },
            ],
            default: 'or',
            description: 'How to combine multiple Existing Data Points. Only sent when at least one data point is selected.',
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
				typeOptions: { loadOptionsMethod: 'getMainIndustries' },
				default: [],
				description: 'Filter by company main industries',
			},
			{
				displayName: 'Company Sub-Industries',
				name: 'contactSearchCompanySubIndustries',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getSubIndustries' },
				default: [],
				description: 'Filter by company sub-industries',
			},
			{
				displayName: 'Company Countries',
				name: 'contactSearchCompanyCountries',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getCompanyCountries' },
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
			// The remaining V3ContactFilterCriteria and V3CompanyFilterCriteria fields.
			// Split into their own collections rather than added to Search Filters above:
			// that collection is already 18 entries, and every existing parameter name
			// there is preserved so saved workflows keep working.
			{
				displayName: 'Contact Filters (Advanced)',
				name: 'contactAdvancedFilters',
				type: 'collection',
				placeholder: 'Add contact filter',
				default: {},
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['prospectingContacts'],
					},
				},
				options: contactAdvancedFilterOptions(),
			},
			{
				displayName: 'Company Filters (Advanced)',
				name: 'companyAdvancedFilters',
				type: 'collection',
				placeholder: 'Add company filter',
				default: {},
				displayOptions: {
					show: {
						resource: ['contact', 'company'],
						operation: ['prospectingContacts', 'prospectingCompanies'],
					},
				},
				options: companyAdvancedFilterOptions(),
			},
			...geographicFilterProperties(),
			...fundingRowProperties(),

			// ===== CONTACT ENRICH FROM SEARCH FIELDS =====
			// Note: POST /v3/contacts/enrich takes only ids/reveal/waterfallEnabled/tableId.
			// It does NOT accept a requestId, so no such field is collected here.
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
				placeholder: '4389064654, 4389064624',
			},
			{
				displayName: 'Reveal',
				name: 'enrichFromSearchReveal',
				type: 'multiOptions',
				options: [
					{ name: 'Emails', value: 'emails' },
					{ name: 'Phone Numbers', value: 'phones' },
				],
				default: ['emails', 'phones'],
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrichFromSearch'],
					},
				},
				description: 'Which contact data to unlock. Billing applies per revealed field, so narrow this to what you actually need.',
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
				typeOptions: { minValue: 1, maxValue: 100 },
				default: 25,
				displayOptions: {
					show: { resource: ['contact'], operation: ['searchLookalikes'] },
				},
				description: 'Number of lookalike results to return (1–100)',
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
						// Also shown for emailList: execute() reads these options in that
						// mode too, so hiding them there silently forced emails+phones.
						bulkType: ['emailList', 'simple'],
					},
				},
				options: [
					// No 'Filter By' option: filterBy was a v2 search parameter and is not
					// part of V3ContactsSearchRequest (contacts / options / signals only).
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
						// Values must match the V3CompanySignalsDto enum exactly.
						// Company signals are a different vocabulary from contact
						// signals (promotion / companyChange) — do not reuse those here.
						options: [
							{ name: 'All Signals', value: 'allSignals' },
							{ name: 'Headcount Increase (1m)', value: 'headcountIncrease1m' },
							{ name: 'Headcount Increase (3m)', value: 'headcountIncrease3m' },
							{ name: 'Headcount Increase (6m)', value: 'headcountIncrease6m' },
							{ name: 'Headcount Increase (12m)', value: 'headcountIncrease12m' },
							{ name: 'Headcount Decrease (1m)', value: 'headcountDecrease1m' },
							{ name: 'Headcount Decrease (3m)', value: 'headcountDecrease3m' },
							{ name: 'Headcount Decrease (6m)', value: 'headcountDecrease6m' },
							{ name: 'Headcount Decrease (12m)', value: 'headcountDecrease12m' },
							{ name: 'Surge in Hiring', value: 'surgeInHiring' },
							{ name: 'Surge in Hiring by Department', value: 'surgeInHiringByDepartment' },
							{ name: 'Surge in Hiring by Location', value: 'surgeInHiringByLocation' },
							{ name: 'IT Spend Increase', value: 'itSpendIncrease' },
							{ name: 'IT Spend Decrease', value: 'itSpendDecrease' },
							{ name: 'Website Traffic Increase', value: 'websiteTrafficIncrease' },
							{ name: 'Website Traffic Decrease', value: 'websiteTrafficDecrease' },
							{ name: 'LinkedIn Activity Intent', value: 'linkedinActivityIntent' },
							{ name: 'News — Commercial Activity', value: 'commercialActivityNews' },
							{ name: 'News — Corporate Strategy', value: 'corporateStrategyNews' },
							{ name: 'News — Financial Events', value: 'financialEventsNews' },
							{ name: 'News — Market Intelligence', value: 'marketIntelligenceNews' },
							{ name: 'News — People', value: 'peopleNews' },
							{ name: 'News — Product Activity', value: 'productActivityNews' },
							{ name: 'News — Risk', value: 'riskNews' },
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
					// No Max Results Per Signal here: V3CompanySignalsDto accepts only
					// types + startDate. maxResultsPerSignal is contacts-only.
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
				typeOptions: { loadOptionsMethod: 'getCompanyCountries' },
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
				typeOptions: { loadOptionsMethod: 'getMainIndustries' },
				default: [],
				description: 'Filter by main industry',
			},
			{
				displayName: 'Sub-Industries',
				name: 'companySubIndustryIds',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getSubIndustries' },
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
			// Note: POST /v3/companies/enrich takes only ids/reveal/tableId.
			// It does NOT accept a requestId, so no such field is collected here.
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
			// Extra company data points. V3CompaniesEnrichRequest.reveal gates all of
			// these behind an explicit opt-in — without it the response carries only the
			// base firmographics, so none of this was reachable through the node before.
			// Each selected field is charged separately per result.
			{
				displayName: 'Reveal Additional Data',
				name: 'companyReveal',
				type: 'multiOptions',
				options: [
					{ name: 'Competitors', value: 'competitors' },
					{ name: 'Employees by Department', value: 'employeesByDepartment' },
					{ name: 'Employees by Location', value: 'employeesByLocation' },
					{ name: 'Employees by Seniority', value: 'employeesBySeniority' },
					{ name: 'Estimated Annual IT Spend', value: 'estimatedAnnualItSpend' },
					{ name: 'Intent Topics', value: 'intent' },
					{ name: 'Monthly Website Traffic', value: 'monthlyWebsiteTraffic' },
					{ name: 'Open Jobs — by Department', value: 'openJobsByDepartment' },
					{ name: 'Open Jobs — by Location', value: 'openJobsByLocation' },
					{ name: 'Open Jobs — by Seniority', value: 'openJobsBySeniority' },
					{ name: 'Open Jobs — Total', value: 'openJobsTotal' },
				],
				default: [],
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['enrichBulk', 'enrichFromSearch'],
					},
				},
				description: 'Optional extra fields to unlock on each company. Each one is charged separately per result, so select only what you need.',
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
				description: 'List of companies to search and enrich (up to 100). Fill whichever identifier you have — Lusha ID takes priority, then domain, then name.',
				options: [
					{
						name: 'company',
						displayName: 'Company',
						// V3CompanySearchItem accepts only clientReferenceId / id / name / domain.
						// There is deliberately no LinkedIn URL field: company search does not
						// support it, so offering it would build an unmatchable request item.
						values: [
							{ displayName: 'Domain', name: 'domain', type: 'string', default: '', placeholder: 'acme.com' },
							{ displayName: 'Company Name', name: 'name', type: 'string', default: '', placeholder: 'Acme Inc' },
							{ displayName: 'Lusha ID', name: 'lushaId', type: 'string', default: '', description: 'Lusha entity ID from a previous search or enrich result' },
							{ displayName: 'Client Reference ID', name: 'clientReferenceId', type: 'string', default: '', description: 'Your own reference ID, returned in the response for correlation' },
						],
					},
				],
			},

			// Remaining documented request-body fields.
			{
				displayName: 'Table ID',
				name: 'tableId',
				type: 'string',
				default: '',
				placeholder: '482910',
				displayOptions: {
					show: {
						resource: ['contact', 'company'],
						operation: ['enrichBulk', 'enrichFromSearch', 'prospectingContacts', 'prospectingCompanies', 'searchLookalikes'],
					},
				},
				description: 'Optional. Also persist these results into an existing Lusha table, populating the relevant columns. Leave blank to skip.',
			},
			{
				displayName: 'Data Waterfall',
				name: 'waterfallEnabled',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrichBulk', 'enrichFromSearch'],
					},
				},
				description: 'Whether this call may fall through to your enabled third-party providers when Lusha has no match. Defaults to on whenever Data Waterfall is enabled on your account; turn off to opt this call out. No effect if the waterfall is off account-wide.',
			},
			{
				displayName: 'Options',
				name: 'searchAndEnrichOptions',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: {
					show: {
						resource: ['contact', 'company'],
						operation: ['searchAndEnrich'],
					},
				},
				options: [
					{
						displayName: 'Include Partial Profiles',
						name: 'includePartialProfiles',
						type: 'boolean',
						default: false,
						description: 'Whether to include profiles where only partial data is available',
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
						typeOptions: { minValue: 0, maxValue: 1000 },
						default: 0,
						description: 'Page number for pagination (0–1000, starts at 0)',
					},
					{
						displayName: 'Page Size',
						name: 'pageSize',
						type: 'number',
						typeOptions: { minValue: 10, maxValue: 100 },
						default: 25,
						description: 'Number of results per page. The API accepts 10–100; values outside that range are clamped.',
					},
					// Prospecting request `options` block. Distinct from the search-only
					// Options collection: these apply to the prospecting endpoints and were
					// previously unreachable.
					{
						displayName: 'Include Partial Profiles',
						name: 'includePartialProfiles',
						type: 'boolean',
						default: true,
						description: 'Whether to include profiles where only partial data is available',
					},
					{
						displayName: 'Exclude Do-Not-Call',
						name: 'excludeDnc',
						type: 'boolean',
						default: false,
						description: 'Whether to exclude contacts flagged do-not-call. Contact prospecting only.',
					},
					{
						displayName: 'Max Contacts Per Company',
						name: 'maxContactsPerCompany',
						type: 'number',
						typeOptions: { minValue: 1, maxValue: 20 },
						default: 0,
						description: 'Cap how many contacts are returned per company (1–20). This is not the page size — Page Size still controls that. Leave at 0 for uncapped. Contact prospecting only.',
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

	// Filter vocabularies are fetched from Lusha's own discovery endpoints so they
	// cannot go stale. Every method falls back to the generated static list when the
	// call fails, so the editor still works without credentials or network access.
	methods = {
		loadOptions: {
			async getMainIndustries(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const rows = await fetchCatalog(this, '/v3/companies/prospecting/filters/industriesLabels');
				if (!rows) return getMainIndustryOptions();
				return rows
					.filter((r: IDataObject) => r.main_industry_id !== undefined)
					.map((r: IDataObject) => ({ name: String(r.main_industry), value: String(r.main_industry_id) }));
			},

			async getSubIndustries(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const rows = await fetchCatalog(this, '/v3/companies/prospecting/filters/industriesLabels');
				if (!rows) return getSubIndustryOptions();
				// Flatten parent -> children, then parent-qualify any label that occurs
				// under more than one parent (notably "Other", which repeats ~15 times).
				const flat: Array<{ id: string; label: string; parent: string }> = [];
				rows.forEach((m: IDataObject) => {
					((m.sub_industries as IDataObject[]) ?? []).forEach((s) => {
						flat.push({ id: String(s.id), label: String(s.value), parent: String(m.main_industry) });
					});
				});
				const freq: Record<string, number> = {};
				flat.forEach((s) => (freq[s.label] = (freq[s.label] ?? 0) + 1));
				const seen = new Set<string>();
				return flat
					.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)))
					.map((s) => ({ name: freq[s.label] > 1 ? `${s.parent}: ${s.label}` : s.label, value: s.id }));
			},

			async getContactCountries(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const rows = await fetchCatalog(this, '/v3/contacts/prospecting/filters/countries');
				if (!rows) return getContactCountryOptions();
				// filters.contacts.include.countries takes ISO-2 codes only.
				return rows.map((r: IDataObject) => ({
					name: String(r.name ?? r.code),
					value: String(r.code ?? r.name),
				}));
			},

			async getCompanyCountries(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const rows = await fetchCatalog(this, '/v3/contacts/prospecting/filters/countries');
				if (!rows) return getCompanyCountryOptions();
				// V3Location.country takes the full country name, never the ISO-2 code.
				return rows.map((r: IDataObject) => {
					const name = String(r.name ?? r.code);
					return { name, value: name };
				});
			},

			async getDepartments(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const rows = await fetchCatalog(this, '/v3/contacts/prospecting/filters/departments');
				if (!rows) return getDepartmentOptions();
				return rows.map((r: unknown) => {
					const v = typeof r === 'string' ? r : String((r as IDataObject).value ?? (r as IDataObject).name);
					return { name: v, value: v };
				});
			},

			async getSeniorities(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const rows = await fetchCatalog(this, '/v3/contacts/prospecting/filters/seniority');
				if (!rows) return getSeniorityOptions();
				// seniorityIds must be integers. The catalog returns lowercase names, so
				// prefer our own casing for known IDs and title-case anything new.
				return rows.map((r: IDataObject) => ({
					name: SENIORITY_LABELS[String(r.id)] ?? titleCaseLabel(String(r.name ?? r.id)),
					value: Number(r.id),
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				// Read per item, not once at index 0: Resource and Operation can be driven
				// by expressions, and hoisting them applied item 0's choice to every item.
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				// Populated by the two-step bulk-enrich flow so the caller can see how
				// many identifiers actually resolved and which ones did not.
				let bulkEnrichContext: IDataObject | undefined;

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

							if (contacts.length === 0) {
								throw new NodeOperationError(
									this.getNode(),
									'Search Contacts: provide at least one Email, LinkedIn URL, or Lusha ID.',
									{ itemIndex: i },
								);
							}

							const searchContactsBody: IDataObject = { contacts: contacts.slice(0, 100) };

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
							const pageSize = this.getNodeParameter('searchAdditionalOptions.pageSize', i, 25) as number;

							const contactSearchBody: IDataObject = {
								pagination: {
									page: clampPage(page),
									// V3PaginationRequest.size must be 10–100. The previous
									// Math.min(pageSize, 50) let sub-10 values through (a 400)
									// and capped the page at half of what the API allows.
									size: clampPageSize(pageSize),
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

							// Add existing data points. existingDataPointsCondition is only
							// meaningful alongside them, so it is not sent on its own.
							const existingDataPoints = this.getNodeParameter('contactSearchFilters.existingDataPoints', i, []) as string[];
							if (existingDataPoints.length) {
								const contactInclude = ((contactSearchBody.filters as IDataObject)
									.contacts as IDataObject).include as IDataObject;
								contactInclude.existingDataPoints = existingDataPoints;
								const edpCondition = this.getNodeParameter('contactSearchFilters.existingDataPointsCondition', i, '') as string;
								if (edpCondition && existingDataPoints.length > 1) {
									contactInclude.existingDataPointsCondition = edpCondition;
								}
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

							// Company country / state / city all collapse into a single
							// locations[] array. V3CompanyFilterCriteria has NO `countries`
							// field (that exists only on the contact criteria), so the old
							// `companiesInclude.countries = [...]` was rejected outright with
							// "property countries should not exist".
							//
							// The key is `country` with a FULL country name. Verified against
							// the live API: `countryIso2` is rejected by companies/prospecting
							// and, worse, accepted by contacts/prospecting while matching
							// nothing — so the option values here are full names, not ISO-2.
							const companyCountries = this.getNodeParameter('contactSearchFilters.contactSearchCompanyCountries', i, []) as string[];
							const companyStates = this.getNodeParameter('contactSearchFilters.contactSearchCompanyStates', i, '') as string;
							const companyCities = this.getNodeParameter('contactSearchFilters.contactSearchCompanyCities', i, '') as string;
							const companyLocations: IDataObject[] = [];
							companyCountries.filter((c) => c).forEach((country) => {
								companyLocations.push({ country });
							});
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

							// Add SIC codes. The field is `sicCodes`, not `sicsCodes` —
							// the old spelling matched nothing in V3CompanyFilterCriteria.
							const sicsCodes = this.getNodeParameter('contactSearchFilters.contactSearchSicsCodes', i, '') as string;
							if (sicsCodes) {
								const sicsList = sicsCodes.split(',').map((c) => c.trim()).filter((c) => c);
								if (sicsList.length) {
									const companiesInclude = ((contactSearchBody.filters as IDataObject)
										.companies as IDataObject).include as IDataObject;
									companiesInclude.sicCodes = sicsList;
								}
							}

							// searchText and signals belong inside filters.contacts.include —
							// V3ProspectingContactsRequest only has pagination/filters/tableId/options,
							// so setting them at the top level meant they were never applied.
							const searchText = this.getNodeParameter('searchAdditionalOptions.searchText', i, '') as string;
							if (searchText) {
								const contactInclude = ((contactSearchBody.filters as IDataObject)
									.contacts as IDataObject).include as IDataObject;
								contactInclude.searchText = searchText;
							}

							const signalNames = this.getNodeParameter('searchAdditionalOptions.signalNames', i, []) as string[];
							if (signalNames.length) {
								const signalStartDate = this.getNodeParameter('searchAdditionalOptions.signalStartDate', i, '') as string;
								const signalFilter: IDataObject = { types: signalNames };
								if (signalStartDate) signalFilter.startDate = signalStartDate;
								const contactInclude = ((contactSearchBody.filters as IDataObject)
									.contacts as IDataObject).include as IDataObject;
								contactInclude.signals = signalFilter;
							}

							// Remaining documented filter fields, contact and company side.
							const contactAdvanced = this.getNodeParameter('contactAdvancedFilters', i, {}) as IDataObject;
							if (Object.keys(contactAdvanced).length) {
								const contactInclude = ((contactSearchBody.filters as IDataObject)
									.contacts as IDataObject).include as IDataObject;
								applyContactAdvancedFilters(contactAdvanced, contactInclude);
							}
							const companyAdvancedOnContacts = this.getNodeParameter('companyAdvancedFilters', i, {}) as IDataObject;
							if (Object.keys(companyAdvancedOnContacts).length) {
								const companiesInclude = ((contactSearchBody.filters as IDataObject)
									.companies as IDataObject).include as IDataObject;
								applyCompanyAdvancedFilters(companyAdvancedOnContacts, companiesInclude);
							}

							applyGeographicFilters(
								{
									contactGeo: this.getNodeParameter('contactGeographicDetails', i, {}) as IDataObject,
									companyGeo: this.getNodeParameter('companyGeographicDetails', i, {}) as IDataObject,
									locationsZip: this.getNodeParameter('companyLocationsZipcodes', i, {}) as IDataObject,
									hqZip: this.getNodeParameter('companyHeadquarterZipcodes', i, {}) as IDataObject,
								},
								((contactSearchBody.filters as IDataObject).contacts as IDataObject).include as IDataObject,
								((contactSearchBody.filters as IDataObject).companies as IDataObject).include as IDataObject,
							);

							applyFundingRows(
								{
									ranges: this.getNodeParameter('companyFundingRanges', i, {}) as IDataObject,
									rounds: this.getNodeParameter('companyFundingRounds', i, {}) as IDataObject,
									names: this.getNodeParameter('companyFundingNames', i, {}) as IDataObject,
								},
								((contactSearchBody.filters as IDataObject).companies as IDataObject).include as IDataObject,
							);

							if (pruneEmptyFilterBlocks(contactSearchBody.filters as IDataObject) === 0) {
								throw new NodeOperationError(
									this.getNode(),
									'Prospect Contacts: set at least one filter (job title, department, seniority, country, or a company filter) before running.',
									{ itemIndex: i },
								);
							}

							// V3ProspectingContactsRequest.options.
							// Read the collection as a whole rather than via dotted paths:
							// getNodeParameter throws "Could not get parameter" for a key the
							// user has not added to a collection unless a concrete fallback is
							// supplied, and `undefined` does not count as one.
							const prospectOptions = this.getNodeParameter('searchAdditionalOptions', i, {}) as IDataObject;
							const contactProspectOptions: IDataObject = {};
							if (prospectOptions.includePartialProfiles !== undefined) {
								contactProspectOptions.includePartialProfiles = prospectOptions.includePartialProfiles as boolean;
							}
							if (prospectOptions.excludeDnc !== undefined) {
								contactProspectOptions.excludeDnc = prospectOptions.excludeDnc as boolean;
							}
							// 0 means uncapped; the API accepts 1-20 only, so omit it otherwise.
							const cpMaxPerCompany = Number(prospectOptions.maxContactsPerCompany ?? 0);
							if (Number.isFinite(cpMaxPerCompany) && cpMaxPerCompany >= 1) {
								contactProspectOptions.maxContactsPerCompany = Math.min(20, Math.floor(cpMaxPerCompany));
							}
							if (Object.keys(contactProspectOptions).length) {
								contactSearchBody.options = contactProspectOptions;
							}

							requestOptions.body = withTableId(contactSearchBody, this.getNodeParameter('tableId', i, '') as string);
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
								throw new NodeOperationError(
									this.getNode(),
									'No contact IDs found. Ensure the search operation returned results.',
									{ itemIndex: i },
								);
							}

							requestOptions.url = '/v3/contacts/enrich';
							requestOptions.method = 'POST';
							if (!requestOptions.headers) requestOptions.headers = {};
							requestOptions.headers['Content-Type'] = 'application/json';
							delete requestOptions.qs;

							// Honour the Reveal selection instead of always billing for both.
							const efsReveal = this.getNodeParameter('enrichFromSearchReveal', i, ['emails', 'phones']) as string[];
							// waterfallEnabled defaults to true server-side, so only send the opt-out.
							const efsWaterfall = this.getNodeParameter('waterfallEnabled', i, true) as boolean;
							requestOptions.body = withTableId({
								ids: contactIds.map((id) => String(id)).slice(0, 100),
								reveal: efsReveal.length ? efsReveal : ['emails', 'phones'],
								...(efsWaterfall === false ? { waterfallEnabled: false } : {}),
							}, this.getNodeParameter('tableId', i, '') as string);
							break;
						}

						case 'enrichBulk': {
							const bulkType = this.getNodeParameter('bulkType', i, 'emailList') as string;

							let bulkContacts: IDataObject[] = [];
							const bulkReveal: string[] = [];

							if (bulkType === 'emailList') {
								const emailListRaw = this.getNodeParameter('bulkEmailList', i, '') as string;
								const emails = emailListRaw
									.split(',')
									.map((e) => e.trim())
									.filter((e) => e);
								if (emails.length === 0) {
									throw new NodeOperationError(this.getNode(), 'Email Addresses field is empty.', { itemIndex: i });
								}
								bulkContacts = emails.map((email, idx) => ({
									clientReferenceId: String(idx + 1),
									email,
								}));
								const bulkRevealEmails = this.getNodeParameter('contactBulkAdditionalOptions.bulkRevealEmails', i, false) as boolean;
								const bulkRevealPhones = this.getNodeParameter('contactBulkAdditionalOptions.bulkRevealPhones', i, false) as boolean;
								if (bulkRevealEmails) bulkReveal.push('emails');
								if (bulkRevealPhones) bulkReveal.push('phones');
								if (bulkReveal.length === 0) bulkReveal.push('emails', 'phones');
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

								if (bulkRevealEmails) bulkReveal.push('emails');
								if (bulkRevealPhones) bulkReveal.push('phones');
								if (bulkReveal.length === 0) bulkReveal.push('emails', 'phones');

								bulkContacts = contacts;
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
									throw new NodeOperationError(this.getNode(), 'Contacts Payload (JSON) must be valid JSON.', { itemIndex: i });
								}

								bulkContacts = (payload.contacts as IDataObject[]) ?? [];
								const payloadReveal = (payload.reveal as string[]) ?? [];
								bulkReveal.push(...(payloadReveal.length ? payloadReveal : ['emails', 'phones']));
							}

							if (!bulkContacts.length) {
								throw new NodeOperationError(this.getNode(), 'No contacts provided for bulk enrichment.', { itemIndex: i });
							}

							// Step 1: resolve raw identifiers (emails, LinkedIn URLs, names+company)
							// to Lusha contact IDs. `filterBy` is deliberately not sent — it was a
							// v2 parameter and is not part of V3ContactsSearchRequest.
							const bulkSearchBody: IDataObject = { contacts: bulkContacts.slice(0, 100) };

							const bulkSearchResponse = (await this.helpers.httpRequestWithAuthentication.call(this, 'lushaApi', {
								baseURL: 'https://api.lusha.com',
								url: '/v3/contacts/search',
								method: 'POST',
								headers: {
									Accept: 'application/json',
									'Content-Type': 'application/json',
									prtnr: 'n8n_connector-prod',
								},
								body: bulkSearchBody,
								json: true,
							})) as any;

							const bulkSearchResults: any[] = bulkSearchResponse.results ?? bulkSearchResponse.data ?? [];

							// Search returns only the contacts it could match, and the previous
							// code just collected every id it happened to return — so inputs
							// that matched nothing disappeared with no signal to the caller.
							// Correlate on clientReferenceId so we can report exactly which
							// identifiers resolved and which did not.
							const bulkMatched: IDataObject[] = [];
							const bulkUnmatched: IDataObject[] = [];
							const bulkResultsByRef = new Map<string, any>();
							for (const r of bulkSearchResults) {
								if (r?.clientReferenceId !== undefined && r?.clientReferenceId !== null) {
									bulkResultsByRef.set(String(r.clientReferenceId), r);
								}
							}

							for (const requested of bulkContacts.slice(0, 100)) {
								const ref = requested.clientReferenceId !== undefined ? String(requested.clientReferenceId) : '';
								const match = ref ? bulkResultsByRef.get(ref) : undefined;
								const matchedId = match ? (match.id ?? match.contactId) : undefined;
								if (matchedId) {
									bulkMatched.push({ clientReferenceId: ref, id: String(matchedId) });
								} else {
									bulkUnmatched.push(requested);
								}
							}

							// If the API returned results without echoing clientReferenceId, fall
							// back to taking every id it did return rather than losing them all.
							if (!bulkMatched.length && bulkSearchResults.length) {
								for (const r of bulkSearchResults) {
									const id = r?.id ?? r?.contactId;
									if (id) bulkMatched.push({ clientReferenceId: String(r?.clientReferenceId ?? ''), id: String(id) });
								}
							}

							if (!bulkMatched.length) {
								throw new NodeOperationError(
									this.getNode(),
									'No contacts matched during search; nothing to enrich.',
									{ itemIndex: i },
								);
							}

							// Surface the drop-outs instead of letting them vanish.
							bulkEnrichContext = {
								requested: bulkContacts.slice(0, 100).length,
								matched: bulkMatched.length,
								unmatched: bulkUnmatched,
								searchRequestId: bulkSearchResponse?.requestId,
							};

							// Step 2: enrich the resolved IDs
							requestOptions.url = '/v3/contacts/enrich';
							requestOptions.method = 'POST';
							if (!requestOptions.headers) requestOptions.headers = {};
							requestOptions.headers['Content-Type'] = 'application/json';
							delete requestOptions.qs;
							const bulkWaterfall = this.getNodeParameter('waterfallEnabled', i, true) as boolean;
							requestOptions.body = withTableId({
								ids: bulkMatched.map((m) => m.id as string),
								reveal: bulkReveal,
								...(bulkWaterfall === false ? { waterfallEnabled: false } : {}),
							}, this.getNodeParameter('tableId', i, '') as string);
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

							if (seContactList.length === 0) {
								throw new NodeOperationError(
									this.getNode(),
									'Add at least one contact to the Contacts list.',
									{ itemIndex: i },
								);
							}

							const seReveal = this.getNodeParameter('searchAndEnrichReveal', i, ['emails', 'phones']) as string[];
							if (seReveal.length === 0) seReveal.push('emails', 'phones');

							const seOptions = this.getNodeParameter('searchAndEnrichOptions', i, {}) as IDataObject;
							requestOptions.body = {
								contacts: seContactList.slice(0, 100),
								reveal: seReveal,
								...(seOptions.includePartialProfiles !== undefined
									? { options: { includePartialProfiles: seOptions.includePartialProfiles as boolean } }
									: {}),
							};
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
								// Use `ids` (strings), the preferred form. The legacy `contactIds`
								// field is numeric, and coercing through Number() both dropped a
								// literal "0" id and risked precision loss on long Lusha IDs.
								seeds.ids = splitSeedVals(seedItems);
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

							// The endpoint requires 5–100 seeds. Fail here with a clear message
							// rather than sending an empty seeds object and getting a bare 400.
							const seedCount = Object.values(seeds).reduce<number>(
								(n, v) => n + (Array.isArray(v) ? v.length : 0),
								0,
							);
							if (seedCount < 5) {
								throw new NodeOperationError(
									this.getNode(),
									`Contact Lookalikes needs at least 5 seeds (got ${seedCount}). Add more seed rows, or comma-separate several values in one row.`,
									{ itemIndex: i },
								);
							}

							const body: IDataObject = { seeds, limit: Math.min(100, Math.max(1, limit)) };
							if (dedupeSessionId) body.dedupeSessionId = dedupeSessionId;
							if (excludeEmails) {
								body.exclude = {
									emails: excludeEmails.split(',').map((e: string) => e.trim()).filter(Boolean),
								};
							}

							requestOptions.body = withTableId(body, this.getNodeParameter('tableId', i, '') as string);
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

							if (companiesArr.length === 0) {
								throw new NodeOperationError(
									this.getNode(),
									'Search Companies: provide at least one domain, company name, or Lusha ID.',
									{ itemIndex: i },
								);
							}

							const searchCompaniesBody: IDataObject = { companies: companiesArr.slice(0, 100) };

							const searchCompaniesOptions = this.getNodeParameter('searchCompaniesOptions', i, {}) as IDataObject;
							if (searchCompaniesOptions.includePartialProfiles) {
								searchCompaniesBody.options = { includePartialProfiles: true };
							}

							const companySignalTypes = (searchCompaniesOptions.signalTypes as string[]) ?? [];
							if (companySignalTypes.length) {
								// V3CompanySignalsDto accepts types + startDate only.
								// maxResultsPerSignal is a contacts-only field and is not sent here.
								const signalFilter: IDataObject = { types: companySignalTypes };
								if (searchCompaniesOptions.signalStartDate) signalFilter.startDate = searchCompaniesOptions.signalStartDate;
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
							const pageSize = this.getNodeParameter('searchAdditionalOptions.pageSize', i, 25) as number;

							const companySearchBody: IDataObject = {
								pagination: {
									page: clampPage(page),
									// V3PaginationRequest.size must be 10–100.
									size: clampPageSize(pageSize),
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
								// Filter blanks: the option list used to carry a placeholder entry
								// with an empty value, which produced an invalid { country: "" }.
								companyCountries.filter((c) => c).forEach((country) => companyLocations.push({ country }));
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

							// Remaining documented company filter fields.
							const companyAdvanced = this.getNodeParameter('companyAdvancedFilters', i, {}) as IDataObject;
							if (Object.keys(companyAdvanced).length) {
								applyCompanyAdvancedFilters(companyAdvanced, companiesInclude);
							}

							applyGeographicFilters(
								{
									companyGeo: this.getNodeParameter('companyGeographicDetails', i, {}) as IDataObject,
									locationsZip: this.getNodeParameter('companyLocationsZipcodes', i, {}) as IDataObject,
									hqZip: this.getNodeParameter('companyHeadquarterZipcodes', i, {}) as IDataObject,
								},
								null,
								companiesInclude,
							);

							applyFundingRows(
								{
									ranges: this.getNodeParameter('companyFundingRanges', i, {}) as IDataObject,
									rounds: this.getNodeParameter('companyFundingRounds', i, {}) as IDataObject,
									names: this.getNodeParameter('companyFundingNames', i, {}) as IDataObject,
								},
								companiesInclude,
							);

							if (pruneEmptyFilterBlocks(companySearchBody.filters as IDataObject) === 0) {
								throw new NodeOperationError(
									this.getNode(),
									'Prospect Companies: set at least one filter (name/domain, country, employee count, industry, or revenue) before running.',
									{ itemIndex: i },
								);
							}

							// V3ProspectingCompaniesRequest.options accepts only
							// includePartialProfiles — excludeDnc and maxContactsPerCompany
							// are contact-side fields and are deliberately not forwarded.
							const companyProspectOptions = this.getNodeParameter('searchAdditionalOptions', i, {}) as IDataObject;
							if (companyProspectOptions.includePartialProfiles !== undefined) {
								companySearchBody.options = {
									includePartialProfiles: companyProspectOptions.includePartialProfiles as boolean,
								};
							}

							requestOptions.body = withTableId(companySearchBody, this.getNodeParameter('tableId', i, '') as string);
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
								throw new NodeOperationError(
									this.getNode(),
									'No company IDs found. Ensure the search operation returned results or provide company IDs.',
									{ itemIndex: i },
								);
							}

							requestOptions.url = '/v3/companies/enrich';
							requestOptions.method = 'POST';
							if (!requestOptions.headers) requestOptions.headers = {};
							requestOptions.headers['Content-Type'] = 'application/json';
							delete requestOptions.qs;

							// V3CompaniesEnrichRequest.ids: strings, max 100.
							const efsCompanyReveal = this.getNodeParameter('companyReveal', i, []) as string[];
							requestOptions.body = withTableId({
								ids: companiesIds.map((id) => String(id)).slice(0, 100),
								...(efsCompanyReveal.length ? { reveal: efsCompanyReveal } : {}),
							}, this.getNodeParameter('tableId', i, '') as string);
							break;
						}

						case 'enrichBulk': {
							const bulkType = this.getNodeParameter('companyBulkType', i, 'simple') as string;

							let bulkCompanies: IDataObject[] = [];

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

								bulkCompanies = companies;
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
									throw new NodeOperationError(this.getNode(), 'Companies Payload (JSON) must be valid JSON.', { itemIndex: i });
								}

								bulkCompanies = (payload.companies as IDataObject[]) ?? [];
							}

							if (!bulkCompanies.length) {
								throw new NodeOperationError(this.getNode(), 'No companies provided for bulk enrichment.', { itemIndex: i });
							}

							// Step 1: resolve raw identifiers (domains, names) to Lusha company IDs
							const bulkCompanySearchResponse = (await this.helpers.httpRequestWithAuthentication.call(this, 'lushaApi', {
								baseURL: 'https://api.lusha.com',
								url: '/v3/companies/search',
								method: 'POST',
								headers: {
									Accept: 'application/json',
									'Content-Type': 'application/json',
									prtnr: 'n8n_connector-prod',
								},
								body: { companies: bulkCompanies.slice(0, 100) },
								json: true,
							})) as any;

							const bulkCompanySearchResults: any[] = bulkCompanySearchResponse.results ?? bulkCompanySearchResponse.data ?? [];

							// Same as the contact flow: correlate on clientReferenceId so
							// companies the search could not match are reported rather than
							// silently dropped from the enrich call.
							const bulkCompanyMatched: IDataObject[] = [];
							const bulkCompanyUnmatched: IDataObject[] = [];
							const bulkCompanyResultsByRef = new Map<string, any>();
							for (const r of bulkCompanySearchResults) {
								if (r?.clientReferenceId !== undefined && r?.clientReferenceId !== null) {
									bulkCompanyResultsByRef.set(String(r.clientReferenceId), r);
								}
							}

							for (const requested of bulkCompanies.slice(0, 100)) {
								const ref = requested.clientReferenceId !== undefined ? String(requested.clientReferenceId) : '';
								const match = ref ? bulkCompanyResultsByRef.get(ref) : undefined;
								const matchedId = match ? (match.id ?? match.companyId) : undefined;
								if (matchedId) bulkCompanyMatched.push({ clientReferenceId: ref, id: String(matchedId) });
								else bulkCompanyUnmatched.push(requested);
							}

							if (!bulkCompanyMatched.length && bulkCompanySearchResults.length) {
								for (const r of bulkCompanySearchResults) {
									const id = r?.id ?? r?.companyId;
									if (id) bulkCompanyMatched.push({ clientReferenceId: String(r?.clientReferenceId ?? ''), id: String(id) });
								}
							}

							if (!bulkCompanyMatched.length) {
								throw new NodeOperationError(
									this.getNode(),
									'No companies matched during search; nothing to enrich.',
									{ itemIndex: i },
								);
							}

							bulkEnrichContext = {
								requested: bulkCompanies.slice(0, 100).length,
								matched: bulkCompanyMatched.length,
								unmatched: bulkCompanyUnmatched,
								searchRequestId: bulkCompanySearchResponse?.requestId,
							};

							// Step 2: enrich the resolved IDs
							requestOptions.url = '/v3/companies/enrich';
							requestOptions.method = 'POST';
							if (!requestOptions.headers) requestOptions.headers = {};
							requestOptions.headers['Content-Type'] = 'application/json';
							delete requestOptions.qs;
							const bulkCompanyReveal = this.getNodeParameter('companyReveal', i, []) as string[];
							requestOptions.body = withTableId({
								ids: bulkCompanyMatched.map((m) => m.id as string),
								...(bulkCompanyReveal.length ? { reveal: bulkCompanyReveal } : {}),
							}, this.getNodeParameter('tableId', i, '') as string);
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
										// No linkedinUrl branch: V3CompanySearchItem accepts only
										// clientReferenceId / id / name / domain.
										if (item.lushaId) entry.id = String(item.lushaId).trim();
										else if (item.domain) entry.domain = String(item.domain).trim();
										else if (item.name) entry.name = String(item.name).trim();
										// Skip rows that carry no usable identifier at all.
										if (Object.keys(entry).length > 1) seCompanyList.push(entry);
									}
								});
							}

							if (seCompanyList.length === 0) {
								throw new NodeOperationError(
									this.getNode(),
									'Add at least one company (domain, name, or Lusha ID) to the Companies list.',
									{ itemIndex: i },
								);
							}

							const seCompanyOptions = this.getNodeParameter('searchAndEnrichOptions', i, {}) as IDataObject;
							requestOptions.body = {
								companies: seCompanyList.slice(0, 100),
								...(seCompanyOptions.includePartialProfiles !== undefined
									? { options: { includePartialProfiles: seCompanyOptions.includePartialProfiles as boolean } }
									: {}),
							};
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

							const companySeedCount = Object.values(companySeeds).reduce<number>(
								(n, v) => n + (Array.isArray(v) ? v.length : 0),
								0,
							);
							if (companySeedCount < 5) {
								throw new NodeOperationError(
									this.getNode(),
									`Company Lookalikes needs at least 5 seeds (got ${companySeedCount}). Add more seed rows, or comma-separate several values in one row.`,
									{ itemIndex: i },
								);
							}

							const companyBody: IDataObject = {
								seeds: companySeeds,
								limit: Math.min(100, Math.max(1, companyLimit)),
							};
							if (companyDedupeId) companyBody.dedupeSessionId = companyDedupeId;
							if (excludeDomains) {
								companyBody.exclude = {
									domains: excludeDomains.split(',').map((d: string) => d.trim()).filter(Boolean),
								};
							}

							requestOptions.body = withTableId(companyBody, this.getNodeParameter('tableId', i, '') as string);
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
							// canReveal lists what Enrich can unlock, with a credit cost per
							// field. credits === 0 means it is already revealed for this
							// account, so "new" is a field that still costs something.
							const newContactIds = enrichedResults
								.filter((item: any) =>
									Array.isArray(item.canReveal) &&
									item.canReveal.some((c: any) => Number(c?.credits ?? 0) > 0),
								)
								.map((item: any) => item.id || item.contactId)
								.filter(Boolean);

							json = {
								...searchResponse,
								allContactIds,
								newContactIds,
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

				// Report what the two-step bulk flow actually resolved, so identifiers
				// that failed to match are visible instead of silently absent.
				if (bulkEnrichContext) {
					json = { ...json, lushaBulkEnrich: bulkEnrichContext };
				}

				returnData.push({
					json,
					pairedItem: { item: i },
				});
			} catch (error) {
				const err = error as any;
				// n8n exposes the upstream status on different properties depending on
				// which layer threw, so check all of them rather than just two.
				const status = err?.httpCode ?? err?.statusCode ?? err?.response?.status ?? err?.cause?.response?.status;
				if (String(status) === '451') {
					const gdprError = new NodeOperationError(
						this.getNode(),
						'Request blocked (451): contact data is restricted in your region (GDPR).',
						{ itemIndex: i },
					);
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

'use strict';

/**
 * Locks in the exact request body the node sends for every operation.
 *
 * Why assert on whole payloads rather than individual fields: the bugs this suite
 * exists to prevent were all shape bugs — a misspelled key (`sicsCodes`), a filter
 * at the wrong nesting level (top-level `searchText`), a field that does not exist
 * on the target schema (`countries` on company criteria), a value the API rejects
 * (`countryIso2`). None of those are visible from a field-by-field check; they only
 * show up when you compare the complete body against one the API has accepted.
 *
 * Every expectation below was captured from a real n8n execution and then replayed
 * against the live Lusha API. Do not "fix" a failure here by editing the expected
 * value — verify against the API first, because a change in this file is a change
 * in what we send to Lusha.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { Lusha } = require('../dist/src/nodes/Lusha/Lusha.node.js');
const { makeContext } = require('./helpers/stub-context');

const node = new Lusha();

/** Run one operation and return every request it made, in order. */
async function run(params, options = {}) {
	const { ctx, captured } = makeContext(params, options.inputJson, options.responses);
	await node.execute.call(ctx);
	return captured;
}

/** Assert the operation throws, without any request escaping to the API. */
async function expectGuard(params, pattern) {
	const { ctx, captured } = makeContext(params);
	await assert.rejects(() => node.execute.call(ctx), pattern);
	assert.equal(captured.length, 0, 'a guard must not let any request reach the API');
}

test('contact: search by identifier', async () => {
	const [req] = await run({
		resource: 'contact', operation: 'searchContacts',
		searchContactsInputMode: 'simple',
		searchContactsEmails: 'a@acme.com, b@acme.com',
		searchContactsLinkedinUrls: 'https://www.linkedin.com/in/alice',
		searchContactsLushaIds: '12345',
		searchContactsOptions: {
			includePartialProfiles: true,
			signalTypes: ['promotion'],
			signalStartDate: '2025-01-01',
			maxResultsPerSignal: 10,
		},
	});

	assert.equal(req.method, 'POST');
	assert.equal(req.url, '/v3/contacts/search');
	assert.deepEqual(req.body, {
		contacts: [
			{ clientReferenceId: '1', email: 'a@acme.com' },
			{ clientReferenceId: '2', email: 'b@acme.com' },
			{ clientReferenceId: '3', linkedinUrl: 'https://www.linkedin.com/in/alice' },
			{ clientReferenceId: '4', id: '12345' },
		],
		options: { includePartialProfiles: true },
		// maxResultsPerSignal is valid for CONTACT signals only.
		signals: { types: ['promotion'], startDate: '2025-01-01', maxResultsPerSignal: 10 },
	});
	// filterBy was a v2 parameter; sending it returns "property filterBy should not exist".
	assert.ok(!('filterBy' in req.body), 'filterBy must never be sent to v3');
});

test('contact: prospecting nests every filter correctly', async () => {
	const [req] = await run({
		resource: 'contact', operation: 'prospectingContacts',
		jobTitles: 'VP Sales, Director of Sales',
		departments: ['Sales'],
		seniorities: [8, 6],
		countries: ['US', 'CA'],
		contactSearchFilters: {
			states: 'California',
			cities: 'San Francisco',
			companyDomains: 'Lusha, lusha.com',
			existingDataPoints: ['work_email'],
			contactSearchCompanyEmployeeMin: '51',
			contactSearchCompanyEmployeeMax: '1000',
			contactSearchCompanyRevenueMin: '1000000',
			contactSearchCompanyRevenueMax: '100000000',
			contactSearchCompanyMainIndustries: ['17'],
			contactSearchCompanySubIndustries: ['129'],
			contactSearchCompanyCountries: ['United States'],
			contactSearchCompanyStates: 'New York',
			contactSearchCompanyCities: 'Austin',
			contactSearchTechnologies: 'Salesforce, HubSpot',
			contactSearchIntentTopics: 'Cloud Migration',
			contactSearchNaicsCodes: '511210',
			contactSearchSicsCodes: '7372',
		},
		searchAdditionalOptions: {
			page: 0, pageSize: 100,
			searchText: 'sales automation',
			signalNames: ['promotion'], signalStartDate: '2025-01-01',
		},
	});

	assert.equal(req.url, '/v3/contacts/prospecting');
	assert.deepEqual(req.body, {
		pagination: { page: 0, size: 100 },
		filters: {
			contacts: {
				include: {
					jobTitles: ['VP Sales', 'Director of Sales'],
					departments: ['Sales'],
					seniorityIds: [8, 6],
					// Contact criteria take ISO-2 codes; full names are rejected.
					countries: ['US', 'CA'],
					locations: [{ state: 'California' }, { city: 'San Francisco' }],
					existingDataPoints: ['work_email'],
					// Both of these belong inside contacts.include, NOT at the top level.
					searchText: 'sales automation',
					signals: { types: ['promotion'], startDate: '2025-01-01' },
				},
			},
			companies: {
				include: {
					domains: ['lusha.com'],
					names: ['Lusha'],
					mainIndustriesIds: [17],
					subIndustriesIds: [129],
					sizes: [{ min: 51, max: 1000 }],
					revenues: [{ min: 1000000, max: 100000000 }],
					// Company country is locations[].country with a FULL name. There is
					// no `countries` field here, and `countryIso2` matches nothing.
					locations: [{ country: 'United States' }, { state: 'New York' }, { city: 'Austin' }],
					technologies: ['Salesforce', 'HubSpot'],
					intentTopics: ['Cloud Migration'],
					naicsCodes: ['511210'],
					// sicCodes, not sicsCodes.
					sicCodes: ['7372'],
				},
			},
		},
	});
	assert.ok(!('searchText' in req.body), 'searchText must not sit at the top level');
	assert.ok(!('signals' in req.body), 'signals must not sit at the top level');
});

test('contact: existingDataPoints and its match condition', async () => {
	// The condition is only meaningful with more than one data point, so it must not
	// be sent for a single selection.
	const [single] = await run({
		resource: 'contact', operation: 'prospectingContacts',
		departments: ['Sales'],
		contactSearchFilters: { existingDataPoints: ['work_email'], existingDataPointsCondition: 'and' },
		searchAdditionalOptions: { page: 0, pageSize: 25 },
	});
	const singleInclude = single.body.filters.contacts.include;
	assert.deepEqual(singleInclude.existingDataPoints, ['work_email']);
	assert.ok(
		!('existingDataPointsCondition' in singleInclude),
		'condition is pointless with one data point and must be omitted',
	);

	const [multi] = await run({
		resource: 'contact', operation: 'prospectingContacts',
		departments: ['Sales'],
		contactSearchFilters: { existingDataPoints: ['work_email', 'phone'], existingDataPointsCondition: 'and' },
		searchAdditionalOptions: { page: 0, pageSize: 25 },
	});
	const multiInclude = multi.body.filters.contacts.include;
	assert.deepEqual(multiInclude.existingDataPoints, ['work_email', 'phone']);
	assert.equal(multiInclude.existingDataPointsCondition, 'and');
});

test('contact: page size is clamped into the API range of 10-100', async () => {
	const [tooSmall] = await run({
		resource: 'contact', operation: 'prospectingContacts',
		departments: ['Sales'],
		searchAdditionalOptions: { page: 0, pageSize: 3 },
	});
	assert.equal(tooSmall.body.pagination.size, 10, 'below-minimum sizes return 400 unclamped');

	const [tooBig] = await run({
		resource: 'contact', operation: 'prospectingContacts',
		departments: ['Sales'],
		searchAdditionalOptions: { page: 5000, pageSize: 5000 },
	});
	assert.equal(tooBig.body.pagination.size, 100);
	assert.equal(tooBig.body.pagination.page, 1000);
});

test('contact: prospecting options are sent under options, and omitted when unset', async () => {
	const [withOpts] = await run({
		resource: 'contact', operation: 'prospectingContacts',
		departments: ['Sales'],
		searchAdditionalOptions: {
			page: 0, pageSize: 25,
			includePartialProfiles: false,
			excludeDnc: true,
			maxContactsPerCompany: 2,
		},
	});
	assert.deepEqual(withOpts.body.options, {
		includePartialProfiles: false,
		excludeDnc: true,
		maxContactsPerCompany: 2,
	});

	const [noOpts] = await run({
		resource: 'contact', operation: 'prospectingContacts',
		departments: ['Sales'],
		searchAdditionalOptions: { page: 0, pageSize: 25 },
	});
	assert.ok(!('options' in noOpts.body), 'options must be omitted entirely when nothing is set');

	// 0 means "uncapped"; the API only accepts 1-20 so it must not be forwarded.
	const [uncapped] = await run({
		resource: 'contact', operation: 'prospectingContacts',
		departments: ['Sales'],
		searchAdditionalOptions: { page: 0, pageSize: 25, maxContactsPerCompany: 0 },
	});
	assert.ok(!('maxContactsPerCompany' in (uncapped.body.options || {})));
});

test('contact: enrich from search honours the Reveal selection', async () => {
	const [req] = await run({
		resource: 'contact', operation: 'enrichFromSearch',
		contactSelectionType: 'specific',
		contactIds: '4389064654, 4389064624',
		enrichFromSearchReveal: ['emails'],
	});
	assert.equal(req.url, '/v3/contacts/enrich');
	assert.deepEqual(req.body, { ids: ['4389064654', '4389064624'], reveal: ['emails'] });
});

test('contact: bulk enrich correlates on clientReferenceId and reports the unmatched', async () => {
	// The search stage matches refs 1 and 3; ref 2 resolves to nothing.
	const reqs = await run({
		resource: 'contact', operation: 'enrichBulk',
		bulkType: 'emailList',
		bulkEmailList: 'a@acme.com, b@acme.com, c@acme.com',
		contactBulkAdditionalOptions: { bulkRevealEmails: true, bulkRevealPhones: false },
	}, {
		responses: [{
			requestId: 'r1',
			results: [
				{ clientReferenceId: '1', id: '111' },
				{ clientReferenceId: '3', id: '333' },
			],
		}],
	});

	assert.equal(reqs.length, 2, 'bulk enrich resolves identifiers, then enriches');
	assert.equal(reqs[0].url, '/v3/contacts/search');
	assert.ok(!('filterBy' in reqs[0].body));
	assert.equal(reqs[1].url, '/v3/contacts/enrich');
	// Only the ids that actually matched, and only the requested reveal.
	assert.deepEqual(reqs[1].body, { ids: ['111', '333'], reveal: ['emails'] });
});

test('contact: search-and-enrich', async () => {
	const [req] = await run({
		resource: 'contact', operation: 'searchAndEnrich',
		searchAndEnrichContacts: {
			contact: [
				{ email: 'a@acme.com' },
				{ firstName: 'John', lastName: 'Doe', companyDomain: 'acme.com' },
			],
		},
		searchAndEnrichReveal: ['emails', 'phones'],
	});
	assert.equal(req.url, '/v3/contacts/search-and-enrich');
	assert.deepEqual(req.body, {
		contacts: [
			{ clientReferenceId: '1', email: 'a@acme.com' },
			{ clientReferenceId: '2', firstName: 'John', lastName: 'Doe', companyDomain: 'acme.com' },
		],
		reveal: ['emails', 'phones'],
	});
});

test('contact: lookalike seeds use ids, not the legacy numeric contactIds', async () => {
	const [req] = await run({
		resource: 'contact', operation: 'searchLookalikes',
		contactLookalikeSeedType: 'contactIds',
		contactLookalikeSeeds: { seed: [{ value: '1,2,3,4,5' }] },
		contactLookalikeLimit: 25,
		contactLookalikeOptions: { excludeEmails: 'existing@customer.com' },
	});
	assert.equal(req.url, '/v3/contacts/lookalike');
	assert.deepEqual(req.body, {
		seeds: { ids: ['1', '2', '3', '4', '5'] },
		limit: 25,
		exclude: { emails: ['existing@customer.com'] },
	});
	// ContactIdentifiersBatch sets additionalProperties:false — a wrong key here is
	// rejected with "seeds.property <name> should not exist".
	assert.deepEqual(Object.keys(req.body.seeds), ['ids']);
});

test('company: search by identifier uses real v3 signal types', async () => {
	const [req] = await run({
		resource: 'company', operation: 'searchCompanies',
		searchCompaniesInputMode: 'simple',
		searchCompaniesSimpleInput: 'lusha.com, Acme Corp, 16303253',
		searchCompaniesOptions: {
			includePartialProfiles: true,
			signalTypes: ['headcountIncrease3m', 'surgeInHiring'],
			signalStartDate: '2025-01-01',
			// Deliberately set: it is a contacts-only field and must be dropped here.
			maxResultsPerSignal: 10,
		},
	});
	assert.equal(req.url, '/v3/companies/search');
	assert.deepEqual(req.body, {
		companies: [
			{ clientReferenceId: '1', domain: 'lusha.com' },
			{ clientReferenceId: '2', name: 'Acme Corp' },
			{ clientReferenceId: '3', id: '16303253' },
		],
		options: { includePartialProfiles: true },
		signals: { types: ['headcountIncrease3m', 'surgeInHiring'], startDate: '2025-01-01' },
	});
	assert.ok(
		!('maxResultsPerSignal' in req.body.signals),
		'V3CompanySignalsDto accepts types + startDate only',
	);
});

test('company: prospecting builds locations from country, state and city', async () => {
	const [req] = await run({
		resource: 'company', operation: 'prospectingCompanies',
		searchCompanyDomains: 'Lusha, lusha.com',
		companyCountries: ['United States'],
		companySearchFilters: {
			companyStates: 'California',
			companyCities: 'San Francisco',
			companyEmployeeMin: '51',
			companyEmployeeMax: '1000',
			companyMainIndustryIds: ['17'],
			companySubIndustryIds: ['129'],
			companyRevenueMin: '1000000',
			companyRevenueMax: '100000000',
		},
		searchAdditionalOptions: { page: 1, pageSize: 25 },
	});
	assert.equal(req.url, '/v3/companies/prospecting');
	assert.deepEqual(req.body, {
		pagination: { page: 1, size: 25 },
		filters: {
			companies: {
				include: {
					domains: ['lusha.com'],
					names: ['Lusha'],
					locations: [
						{ country: 'United States' },
						{ state: 'California' },
						{ city: 'San Francisco' },
					],
					sizes: [{ min: 51, max: 1000 }],
					mainIndustriesIds: [17],
					subIndustriesIds: [129],
					revenues: [{ min: 1000000, max: 100000000 }],
				},
			},
		},
	});
});

test('company: enrich sends reveal only when extra fields are selected', async () => {
	const [plain] = await run({
		resource: 'company', operation: 'enrichFromSearch',
		companySelectionType: 'specific',
		companyIds: '16303253, 12790225',
	});
	assert.deepEqual(plain.body, { ids: ['16303253', '12790225'] });

	const [withReveal] = await run({
		resource: 'company', operation: 'enrichFromSearch',
		companySelectionType: 'specific',
		companyIds: '16303253',
		companyReveal: ['competitors', 'intent', 'openJobsTotal'],
	});
	assert.deepEqual(withReveal.body, {
		ids: ['16303253'],
		reveal: ['competitors', 'intent', 'openJobsTotal'],
	});
});

test('company: bulk enrich correlates and carries reveal through', async () => {
	const reqs = await run({
		resource: 'company', operation: 'enrichBulk',
		companyBulkType: 'simple',
		companiesList: { company: [{ domain: 'lusha.com' }, { domain: 'nonexistent-xyz.com' }] },
		companyReveal: ['employeesByDepartment'],
	}, {
		responses: [{ requestId: 'r2', results: [{ clientReferenceId: '1', id: '16303253' }] }],
	});
	assert.equal(reqs.length, 2);
	assert.equal(reqs[0].url, '/v3/companies/search');
	assert.deepEqual(reqs[1].body, {
		ids: ['16303253'],
		reveal: ['employeesByDepartment'],
	});
});

test('company: search-and-enrich never offers linkedinUrl', async () => {
	const [req] = await run({
		resource: 'company', operation: 'searchAndEnrich',
		searchAndEnrichCompanies: { company: [{ domain: 'lusha.com' }, { name: 'Acme Inc' }] },
	});
	assert.equal(req.url, '/v3/companies/search-and-enrich');
	assert.deepEqual(req.body, {
		companies: [
			{ clientReferenceId: '1', domain: 'lusha.com' },
			{ clientReferenceId: '2', name: 'Acme Inc' },
		],
	});
	// V3CompanySearchItem has no linkedinUrl; a row carrying only one would be unmatchable.
	for (const c of req.body.companies) {
		assert.ok(!('linkedinUrl' in c));
	}
});

test('company: lookalike', async () => {
	const [req] = await run({
		resource: 'company', operation: 'searchLookalikes',
		companyLookalikeSeedType: 'domains',
		companyLookalikeSeeds: {
			seed: [{ value: 'sap.com, oracle.com, salesforce.com, hubspot.com, zoom.us' }],
		},
		companyLookalikeLimit: 25,
		companyLookalikeOptions: { excludeDomains: 'competitor.com' },
	});
	assert.equal(req.url, '/v3/companies/lookalike');
	assert.deepEqual(req.body, {
		seeds: { domains: ['sap.com', 'oracle.com', 'salesforce.com', 'hubspot.com', 'zoom.us'] },
		limit: 25,
		exclude: { domains: ['competitor.com'] },
	});
});

test('guards fail before spending any credits', async () => {
	await expectGuard(
		{
			resource: 'contact', operation: 'prospectingContacts',
			searchAdditionalOptions: { page: 0, pageSize: 25 },
		},
		/at least one filter/i,
	);

	await expectGuard(
		{
			resource: 'contact', operation: 'searchLookalikes',
			contactLookalikeSeedType: 'emails',
			contactLookalikeSeeds: { seed: [{ value: 'a@b.com' }] },
		},
		/at least 5 seeds/i,
	);

	await expectGuard(
		{
			resource: 'company', operation: 'searchCompanies',
			searchCompaniesInputMode: 'simple',
			searchCompaniesSimpleInput: '   ',
		},
		/at least one domain/i,
	);

	await expectGuard(
		{ resource: 'contact', operation: 'searchContacts', searchContactsInputMode: 'simple' },
		/at least one Email/i,
	);
});

test('every request carries auth-adjacent headers and the partner tag', async () => {
	const reqs = await run({
		resource: 'contact', operation: 'searchContacts',
		searchContactsInputMode: 'simple',
		searchContactsEmails: 'a@acme.com',
	});
	for (const r of reqs) {
		assert.equal(r.baseURL, 'https://api.lusha.com');
		assert.equal(r.headers.prtnr, 'n8n_connector-prod');
		assert.equal(r.headers['Content-Type'], 'application/json');
		assert.equal(r.json, true);
	}
});

test('batch arrays are capped at the documented maximum of 100', async () => {
	const many = Array.from({ length: 150 }, (_, i) => `user${i}@acme.com`).join(', ');
	const [req] = await run({
		resource: 'contact', operation: 'searchContacts',
		searchContactsInputMode: 'simple',
		searchContactsEmails: many,
	});
	assert.equal(req.body.contacts.length, 100);
});

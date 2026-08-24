'use strict';

/**
 * End-to-end check: drives every operation through a REAL n8n instance and asserts
 * what it puts on the wire.
 *
 * The unit suite (test/request-shapes.test.js) uses a stub of IExecuteFunctions. That
 * stub is an assumption about how n8n resolves parameters, and assumptions about
 * collections, displayOptions gating and expression handling are exactly where node
 * bugs hide. This harness removes the assumption: n8n loads the built node, resolves
 * the parameters itself, and executes the workflow. `api.lusha.com` is DNS-aliased
 * inside the container network to a capture server, so nothing reaches Lusha and no
 * credits are spent.
 *
 * Run via test/e2e/run.sh, which builds the image and wires up the network.
 *
 * Prerequisites when running directly:
 *   - n8n listening on N8N_URL (default http://localhost:5699) with the node installed
 *   - the capture mock reachable on MOCK_PORT (default 5443) over https on localhost
 */

const https = require('node:https');

const BASE = process.env.N8N_URL || 'http://localhost:5699';
const MOCK_PORT = Number(process.env.MOCK_PORT || 5443);
const OWNER = { email: 'e2e@example.com', firstName: 'E2E', lastName: 'Test', password: 'TestPassw0rd!' };

let cookie = '';

async function api(path, opts = {}) {
	const res = await fetch(BASE + path, {
		...opts,
		headers: {
			'Content-Type': 'application/json',
			'browser-id': 'lusha-e2e',
			...(cookie ? { cookie } : {}),
			...(opts.headers || {}),
		},
	});
	const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
	if (setCookie.length) cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
	const text = await res.text();
	let json = null;
	try { json = JSON.parse(text); } catch { /* html error page */ }
	return { status: res.status, json, text };
}

/**
 * Talks to the capture mock on localhost. Never to api.lusha.com: outside the
 * container that name resolves to the real Lusha API.
 */
function mock(path) {
	return new Promise((resolve, reject) => {
		const req = https.request(
			{ host: '127.0.0.1', port: MOCK_PORT, path, method: 'GET', rejectUnauthorized: false },
			(res) => { let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => resolve(d)); },
		);
		req.on('error', reject);
		req.end();
	});
}
const captured = async () => JSON.parse(await mock('/__captured'));
const reset = () => mock('/__reset');

/**
 * n8n stores execution data with the `flatted` format (cycle-safe JSON), not plain
 * JSON. Inlined rather than adding a dependency: every string in the payload is an
 * index into the top-level array; other primitives are stored inline.
 */
function reviveFlatted(text) {
	const arr = JSON.parse(text);
	const seen = new Map();
	const walk = (idx) => {
		if (seen.has(idx)) return seen.get(idx);
		const value = arr[idx];
		if (value === null || typeof value !== 'object') { seen.set(idx, value); return value; }
		const out = Array.isArray(value) ? [] : {};
		seen.set(idx, out);
		for (const key of Object.keys(value)) {
			const raw = value[key];
			out[key] = typeof raw === 'string' ? walk(Number(raw)) : raw;
		}
		return out;
	};
	return walk(0);
}

function workflowFor(name, lushaParameters, credentialId) {
	return {
		name,
		settings: { executionOrder: 'v1' },
		nodes: [
			{
				parameters: {},
				id: 'e2e00000-0000-4000-8000-000000000001',
				name: 'When clicking Test',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
			},
			{
				parameters: lushaParameters,
				id: 'e2e00000-0000-4000-8000-000000000002',
				name: 'Lusha',
				type: 'CUSTOM.lusha',
				typeVersion: 1,
				position: [220, 0],
				credentials: { lushaApi: { id: credentialId, name: 'E2E Lusha' } },
			},
		],
		connections: { 'When clicking Test': { main: [[{ node: 'Lusha', type: 'main', index: 0 }]] } },
	};
}

// Mirrors the unit suite so the two can be compared directly.
const CASES = [
	['contact/searchContacts', {
		resource: 'contact', operation: 'searchContacts',
		searchContactsInputMode: 'simple',
		searchContactsEmails: 'a@acme.com, b@acme.com',
		searchContactsLinkedinUrls: 'https://www.linkedin.com/in/alice',
		searchContactsLushaIds: '12345',
		searchContactsOptions: { includePartialProfiles: true, signalTypes: ['promotion'], signalStartDate: '2025-01-01', maxResultsPerSignal: 10 },
	}, { expectUrl: '/v3/contacts/search' }],

	['contact/prospectingContacts', {
		resource: 'contact', operation: 'prospectingContacts',
		jobTitles: 'VP Sales, Director of Sales',
		departments: ['Sales'],
		seniorities: [8, 6],
		countries: ['US', 'CA'],
		contactSearchFilters: {
			states: 'California', cities: 'San Francisco',
			companyDomains: 'Lusha, lusha.com',
			existingDataPoints: ['work_email'],
			contactSearchCompanyEmployeeMin: '51', contactSearchCompanyEmployeeMax: '1000',
			contactSearchCompanyRevenueMin: '1000000', contactSearchCompanyRevenueMax: '100000000',
			contactSearchCompanyMainIndustries: ['17'], contactSearchCompanySubIndustries: ['129'],
			contactSearchCompanyCountries: ['United States'],
			contactSearchCompanyStates: 'New York', contactSearchCompanyCities: 'Austin',
			contactSearchTechnologies: 'Salesforce, HubSpot',
			contactSearchIntentTopics: 'Cloud Migration',
			contactSearchNaicsCodes: '511210', contactSearchSicsCodes: '7372',
		},
		searchAdditionalOptions: { page: 0, pageSize: 100, searchText: 'sales automation', signalNames: ['promotion'], signalStartDate: '2025-01-01' },
	}, {
		expectUrl: '/v3/contacts/prospecting',
		check: (body) => {
			const co = body.filters.companies.include;
			if (!('sicCodes' in co)) return 'sicCodes missing (regression to sicsCodes?)';
			if ('countries' in co) return 'companies.include.countries is rejected by the API';
			const country = (co.locations || []).find((l) => 'country' in l || 'countryIso2' in l);
			if (!country || !('country' in country)) return 'company country must be locations[].country with a full name';
			if ('searchText' in body) return 'searchText must live under filters.contacts.include';
			if ('signals' in body) return 'signals must live under filters.contacts.include';
			return null;
		},
	}],

	['contact/prospecting pageSize clamp', {
		resource: 'contact', operation: 'prospectingContacts',
		departments: ['Sales'],
		searchAdditionalOptions: { page: 0, pageSize: 3 },
	}, {
		expectUrl: '/v3/contacts/prospecting',
		check: (body) => (body.pagination.size === 10 ? null : `size should clamp to 10, got ${body.pagination.size}`),
	}],

	['contact/prospecting options block', {
		resource: 'contact', operation: 'prospectingContacts',
		departments: ['Sales'],
		searchAdditionalOptions: { page: 0, pageSize: 25, includePartialProfiles: false, excludeDnc: true, maxContactsPerCompany: 2 },
	}, {
		expectUrl: '/v3/contacts/prospecting',
		check: (body) => (body.options && body.options.maxContactsPerCompany === 2 && body.options.excludeDnc === true
			? null : `options not forwarded: ${JSON.stringify(body.options)}`),
	}],

	['contact/existingDataPoints + condition', {
		resource: 'contact', operation: 'prospectingContacts',
		departments: ['Sales'],
		contactSearchFilters: { existingDataPoints: ['work_email', 'phone'], existingDataPointsCondition: 'and' },
		searchAdditionalOptions: { page: 0, pageSize: 25 },
	}, {
		expectUrl: '/v3/contacts/prospecting',
		check: (body) => {
			const inc = body.filters.contacts.include;
			if (inc.existingDataPointsCondition !== 'and') return 'existingDataPointsCondition not forwarded';
			// work_phone is NOT a real value despite appearing in the OpenAPI example.
			if (inc.existingDataPoints.includes('work_phone')) return 'work_phone is not a valid data point';
			return null;
		},
	}],

	['contact/advanced filters (full parity surface)', {
		resource: 'contact', operation: 'prospectingContacts',
		departments: ['Sales'],
		contactAdvancedFilters: {
			skills: 'Python, Salesforce',
			scoreMin: 40, scoreMax: 90,
			educationDegrees: 'BSc, MBA',
			educationStartYearGte: 2005,
			jobChangedAfterDate: '2025-01-01',
		},
		companyAdvancedFilters: {
			keywords: 'fintech',
			businessModel: ['B2B'],
			companyType: ['Public Company'],
			foundedYearMin: 2000, foundedYearMax: 2020,
			intentTopicsOperator: 'all',
			fundingIsIpo: true,
		},
		companyFundingRounds: { round: [{ coverage: 'last_round', round: 'series_b' }] },
		contactGeographicDetails: { area: [{ country: 'United States', zipcode: '94105', distance: 25 }] },
		companyLocationsZipcodes: { location: [{ countryIso2: 'US', zipcode: '94105' }] },
		tableId: '',
		searchAdditionalOptions: { page: 0, pageSize: 25 },
	}, {
		expectUrl: '/v3/contacts/prospecting',
		check: (body) => {
			const c = body.filters.contacts.include;
			const k = body.filters.companies.include;
			if (!c.score || c.score.minScore !== 40) return 'score must nest as {minScore,maxScore}';
			if (!c.education || c.education.startYearGte !== 2005) return 'education must nest under one object';
			if (!Array.isArray(c.geographicDetails)) return 'geographicDetails must be an array of objects';
			if (JSON.stringify(k.foundedYear) !== '[{"min":2000,"max":2020}]') return 'foundedYear must be ONE element with min+max merged';
			if (!k.funding || !k.funding.isIpo || !Array.isArray(k.funding.rounds)) return 'funding sub-filters must merge into one object';
			if (!Array.isArray(k.locationsZipcodes)) return 'locationsZipcodes must be an array of objects';
			if ('tableId' in body) return 'a blank tableId must be omitted';
			return null;
		},
	}],

	// The case above covers the interesting shapes. This one sets every remaining
	// advanced filter at once, so no field reaches a release having only ever been
	// built by the unit stub -- real n8n resolves collection parameters itself.
	['contact/advanced filters (every remaining field)', {
		resource: 'contact', operation: 'prospectingContacts',
		departments: ['Sales'],
		contactAdvancedFilters: {
			contactNames: 'Jane Doe',
			// A list of titles to match exactly -- not a boolean toggle on `jobTitles`.
			jobTitlesExactMatch: 'VP Sales, Head of Sales',
			normalizedJobTitles: 'sales_manager',
			contactLinkedinUrls: 'https://www.linkedin.com/in/janedoe',
			contactEmails: 'jane@acme.com',
			contactPreviousEmails: 'jane@old.com',
			previousJobTitle: 'Account Executive',
			certifications: 'AWS Certified',
			awards: 'Top Performer',
			jobChangedLastViewDate: '2025-02-01',
			educationFieldsOfStudy: 'Computer Science',
			educationSchools: 'MIT',
			educationGraduationYearLte: 2012,
		},
		companyAdvancedFilters: {
			industriesLabels: 'Software',
			companyLinkedinUrls: 'https://www.linkedin.com/company/acme',
			exactKeywords: 'fintech',
			keywordsSearchFields: ['description'],
			specialities: 'payments',
			exactSpecialities: 'payments',
			previousCompanyDomains: 'old.com',
			previousCompanyNames: 'Old Corp',
			technologiesCondition: 'and',
			intentTopicsCondition: 'and',
			intentMinScore: 20,
			intentMaxScore: 80,
			topicCountMin: 2,
			topicCountMax: 8,
			fundingInvestors: 'Sequoia, Accel',
			fundingDateCoverage: 'last_funding',
			fundingDate: '2025-01-01',
		},
		searchAdditionalOptions: { page: 0, pageSize: 25 },
	}, {
		expectUrl: '/v3/contacts/prospecting',
		check: (body) => {
			const c = body.filters.contacts.include;
			const k = body.filters.companies.include;
			if (c.education.graduationYearLte !== 2012) return 'education.graduationYearLte lost';
			if (!Array.isArray(c.emails) || c.emails[0] !== 'jane@acme.com') return 'contact emails lost';
			if (JSON.stringify(c.jobTitlesExactMatch) !== '["VP Sales","Head of Sales"]') {
				return `jobTitlesExactMatch must be a string array, got ${JSON.stringify(c.jobTitlesExactMatch)}`;
			}
			if (JSON.stringify(k.topicCountThreshold) !== '[{"min":2,"max":8}]') return 'topicCountThreshold must merge into one element';
			if (JSON.stringify(k.funding.investors) !== '["Sequoia","Accel"]') return 'funding.investors lost';
			if (!k.funding.date || k.funding.date.coverage !== 'last_funding') return 'funding.date must nest coverage with the date';
			if (k.intentMinScore !== 20 || k.intentMaxScore !== 80) return 'intent score bounds lost';
			return null;
		},
	}],

	// prospectingCompanies builds its filters in a block of its own, so passing on the
	// contact side proves nothing about this one. Also the only n8n coverage of the
	// funding-amount/name rows and the two company zipcode row types.
	// The company-side filters that companies/prospecting DOES accept. funding and
	// industriesLabels are absent from its request schema, so they are neither
	// offered nor sent here -- see the contact case above for their coverage.
	['company/prospecting advanced filters + zipcode rows', {
		resource: 'company', operation: 'prospectingCompanies',
		searchCompanyDomains: 'acme.com',
		companyAdvancedFilters: {
			keywords: 'fintech, cloud',
			exactKeywords: 'fintech',
			businessModel: ['B2B'],
			companyType: ['Public Company'],
			foundedYearMin: 2000, foundedYearMax: 2020,
			intentMinScore: 20, intentMaxScore: 80,
			topicCountMin: 2, topicCountMax: 8,
			technologiesCondition: 'and',
			previousCompanyDomains: 'old.com',
			specialities: 'payments',
			companyLinkedinUrls: 'https://www.linkedin.com/company/acme',
		},
		companyGeographicDetails: { area: [{ country: 'United States', zipcode: '10001', distance: 25 }] },
		companyLocationsZipcodes: { location: [{ countryIso2: 'US', zipcode: '94105' }] },
		companyHeadquarterZipcodes: { location: [{ countryIso2: 'US', zipcode: '10001' }] },
		tableId: '482910',
		searchAdditionalOptions: { page: 0, pageSize: 25 },
	}, {
		expectUrl: '/v3/companies/prospecting',
		check: (body) => {
			const k = body.filters.companies.include;
			if (JSON.stringify(k.foundedYear) !== '[{"min":2000,"max":2020}]') return 'foundedYear must merge into one element';
			if (JSON.stringify(k.topicCountThreshold) !== '[{"min":2,"max":8}]') return 'topicCountThreshold must merge into one element';
			if (!Array.isArray(k.geographicDetails) || k.geographicDetails[0].distance !== 25) return 'company geographicDetails lost';
			if (!Array.isArray(k.locationsZipcodes) || !Array.isArray(k.headquarterZipcodes)) return 'both zipcode row types must be sent';
			if (k.locationsZipcodes[0].zipcode === k.headquarterZipcodes[0].zipcode) return 'zipcode row types crossed over';
			if (body.tableId !== '482910') return `a set tableId must be forwarded, got ${body.tableId}`;
			return null;
		},
	}],

	// A workflow saved before the endpoints were told apart can still carry funding
	// and industriesLabels values; the builder must drop them rather than 400.
	// Search Text and the signal fields are offered on this action and were being
	// collected and discarded. companies/prospecting takes both under
	// filters.companies.include.
	['company/prospecting searchText + signals', {
		resource: 'company', operation: 'prospectingCompanies',
		searchCompanyDomains: 'acme.com',
		searchAdditionalOptions: {
			page: 0, pageSize: 25,
			searchText: 'sales automation',
			signalNames: ['headcountIncrease3m'],
			signalStartDate: '2025-01-01',
		},
	}, {
		expectUrl: '/v3/companies/prospecting',
		check: (body) => {
			const k = body.filters.companies.include;
			if (k.searchText !== 'sales automation') return `searchText dropped, got ${k.searchText}`;
			if (!k.signals || k.signals.types[0] !== 'headcountIncrease3m') return 'signals dropped';
			if (k.signals.startDate !== '2025-01-01') return 'signal startDate dropped';
			if ('searchText' in body) return 'searchText must not also sit at the top level';
			return null;
		},
	}],

	['company/prospecting drops contacts-only company filters', {
		resource: 'company', operation: 'prospectingCompanies',
		searchCompanyDomains: 'acme.com',
		companyAdvancedFilters: {
			keywords: 'fintech',
			industriesLabels: 'Software',
			fundingIsIpo: true,
			fundingInvestors: 'Sequoia',
			fundingDateCoverage: 'last_funding',
			fundingDate: '2025-01-01',
		},
		companyFundingRanges: { range: [{ coverage: 'total_funds', min: 1000000 }] },
		companyFundingRounds: { round: [{ coverage: 'last_round', round: 'seed' }] },
		companyFundingNames: { type: [{ coverage: 'any_round', name: 'venture' }] },
		searchAdditionalOptions: { page: 0, pageSize: 25 },
	}, {
		expectUrl: '/v3/companies/prospecting',
		check: (body) => {
			const k = body.filters.companies.include;
			if (!('keywords' in k)) return 'a shared filter must still be sent';
			if ('funding' in k) return 'funding is not accepted by companies/prospecting';
			if ('industriesLabels' in k) return 'industriesLabels is not accepted by companies/prospecting';
			return null;
		},
	}],

	['contact/enrichFromSearch waterfall opt-out + tableId', {
		resource: 'contact', operation: 'enrichFromSearch',
		contactSelectionType: 'specific',
		contactIds: '4389064654',
		enrichFromSearchReveal: ['emails'],
		waterfallEnabled: false,
		tableId: '482910',
	}, {
		expectUrl: '/v3/contacts/enrich',
		check: (body) => {
			if (body.waterfallEnabled !== false) return 'an explicit waterfall opt-out must be forwarded';
			if (body.tableId !== '482910') return 'tableId must be forwarded on enrich';
			return null;
		},
	}],

	['contact/enrichFromSearch waterfall default stays implicit', {
		resource: 'contact', operation: 'enrichFromSearch',
		contactSelectionType: 'specific',
		contactIds: '4389064654',
		enrichFromSearchReveal: ['emails'],
		waterfallEnabled: true,
	}, {
		expectUrl: '/v3/contacts/enrich',
		// True is the server default, so sending it would be noise.
		check: (body) => ('waterfallEnabled' in body ? 'the default must not be sent explicitly' : null),
	}],

	['contact/enrichFromSearch reveal=emails', {
		resource: 'contact', operation: 'enrichFromSearch',
		contactSelectionType: 'specific',
		contactIds: '4389064654, 4389064624',
		enrichFromSearchReveal: ['emails'],
	}, {
		expectUrl: '/v3/contacts/enrich',
		check: (body) => (JSON.stringify(body.reveal) === '["emails"]' ? null : 'Reveal selection ignored'),
	}],

	['contact/enrichBulk emailList', {
		resource: 'contact', operation: 'enrichBulk',
		bulkType: 'emailList',
		bulkEmailList: 'a@acme.com, b@acme.com, c@acme.com',
		contactBulkAdditionalOptions: { bulkRevealEmails: true, bulkRevealPhones: false },
	}, { expectUrl: '/v3/contacts/enrich', expectCalls: 2, expectBulkReport: { requested: 3, unmatched: 1 } }],

	['contact/searchAndEnrich', {
		resource: 'contact', operation: 'searchAndEnrich',
		searchAndEnrichContacts: { contact: [{ email: 'a@acme.com' }, { firstName: 'John', lastName: 'Doe', companyDomain: 'acme.com' }] },
		searchAndEnrichReveal: ['emails', 'phones'],
	}, { expectUrl: '/v3/contacts/search-and-enrich' }],

	['contact/searchLookalikes', {
		resource: 'contact', operation: 'searchLookalikes',
		contactLookalikeSeedType: 'contactIds',
		contactLookalikeSeeds: { seed: [{ value: '1,2,3,4,5' }] },
		contactLookalikeLimit: 25,
		contactLookalikeOptions: { excludeEmails: 'existing@customer.com' },
	}, {
		expectUrl: '/v3/contacts/lookalike',
		check: (body) => (Object.keys(body.seeds).join() === 'ids' ? null : `seeds key should be "ids", got ${Object.keys(body.seeds)}`),
	}],

	['company/searchCompanies', {
		resource: 'company', operation: 'searchCompanies',
		searchCompaniesInputMode: 'simple',
		searchCompaniesSimpleInput: 'lusha.com, Acme Corp, 16303253',
		searchCompaniesOptions: { includePartialProfiles: true, signalTypes: ['headcountIncrease3m', 'surgeInHiring'], signalStartDate: '2025-01-01', maxResultsPerSignal: 10 },
	}, {
		expectUrl: '/v3/companies/search',
		check: (body) => ('maxResultsPerSignal' in (body.signals || {}) ? 'maxResultsPerSignal is contacts-only' : null),
	}],

	['company/prospectingCompanies', {
		resource: 'company', operation: 'prospectingCompanies',
		searchCompanyDomains: 'Lusha, lusha.com',
		companyCountries: ['United States'],
		companySearchFilters: {
			companyStates: 'California', companyCities: 'San Francisco',
			companyEmployeeMin: '51', companyEmployeeMax: '1000',
			companyMainIndustryIds: ['17'], companySubIndustryIds: ['129'],
			companyRevenueMin: '1000000', companyRevenueMax: '100000000',
		},
		searchAdditionalOptions: { page: 1, pageSize: 25 },
	}, { expectUrl: '/v3/companies/prospecting' }],

	['company/enrichFromSearch + reveal', {
		resource: 'company', operation: 'enrichFromSearch',
		companySelectionType: 'specific',
		companyIds: '16303253, 12790225',
		companyReveal: ['competitors', 'openJobsTotal'],
	}, {
		expectUrl: '/v3/companies/enrich',
		check: (body) => (JSON.stringify(body.reveal) === '["competitors","openJobsTotal"]' ? null : 'company reveal not forwarded'),
	}],

	['company/enrichBulk simple', {
		resource: 'company', operation: 'enrichBulk',
		companyBulkType: 'simple',
		companiesList: { company: [{ domain: 'lusha.com' }, { domain: 'nonexistent-xyz.com' }] },
	}, { expectUrl: '/v3/companies/enrich', expectCalls: 2, expectBulkReport: { requested: 2, unmatched: 1 } }],

	['company/searchAndEnrich', {
		resource: 'company', operation: 'searchAndEnrich',
		searchAndEnrichCompanies: { company: [{ domain: 'lusha.com' }, { name: 'Acme Inc' }] },
	}, { expectUrl: '/v3/companies/search-and-enrich' }],

	['company/searchLookalikes', {
		resource: 'company', operation: 'searchLookalikes',
		companyLookalikeSeedType: 'domains',
		companyLookalikeSeeds: { seed: [{ value: 'sap.com, oracle.com, salesforce.com, hubspot.com, zoom.us' }] },
		companyLookalikeLimit: 25,
		companyLookalikeOptions: { excludeDomains: 'competitor.com' },
	}, { expectUrl: '/v3/companies/lookalike' }],

	// Guards must fail inside n8n without any request escaping.
	['GUARD prospecting with no filters', {
		resource: 'contact', operation: 'prospectingContacts',
		searchAdditionalOptions: { page: 0, pageSize: 25 },
	}, { expectFail: /at least one filter/i }],

	['GUARD lookalikes with one seed', {
		resource: 'contact', operation: 'searchLookalikes',
		contactLookalikeSeedType: 'emails',
		contactLookalikeSeeds: { seed: [{ value: 'a@b.com' }] },
	}, { expectFail: /at least 5 seeds/i }],

	['GUARD company search with no identifier', {
		resource: 'company', operation: 'searchCompanies',
		searchCompaniesInputMode: 'simple',
		searchCompaniesSimpleInput: '   ',
	}, { expectFail: /at least one domain/i }],
];

(async () => {
	let auth = await api('/rest/owner/setup', { method: 'POST', body: JSON.stringify(OWNER) });
	if (auth.status !== 200) {
		auth = await api('/rest/login', {
			method: 'POST',
			body: JSON.stringify({ emailOrLdapLoginId: OWNER.email, password: OWNER.password }),
		});
	}
	if (auth.status !== 200) {
		console.error(`could not authenticate against ${BASE}: ${auth.status} ${auth.text.slice(0, 200)}`);
		process.exit(1);
	}

	const cred = await api('/rest/credentials', {
		method: 'POST',
		body: JSON.stringify({ name: 'E2E Lusha', type: 'lushaApi', data: { apiKey: 'e2e-mock-key' } }),
	});
	const credentialId = cred.json?.data?.id;
	if (!credentialId) {
		console.error(`could not create credential: ${cred.status} ${cred.text.slice(0, 200)}`);
		process.exit(1);
	}

	// The credential test must use the free usage endpoint, never a billable call.
	await reset();
	const credTest = await api('/rest/credentials/test', {
		method: 'POST',
		body: JSON.stringify({ credentials: { id: credentialId, name: 'E2E Lusha', type: 'lushaApi', data: { apiKey: 'e2e-mock-key' } } }),
	});
	const credTestCalls = await captured();
	let failures = 0;
	const testedUrl = credTestCalls[0]?.url;
	if (testedUrl === '/v3/account/usage') {
		console.log(`PASS  credential test -> GET ${testedUrl} (non-billable)`);
	} else {
		failures++;
		console.log(`FAIL  credential test hit ${testedUrl} instead of /v3/account/usage`);
	}
	if (credTest.json?.data?.status !== 'OK') {
		failures++;
		console.log(`FAIL  credential test status: ${JSON.stringify(credTest.json?.data)}`);
	}

	// Filter dropdowns: confirm each loader resolves through n8n's own
	// dynamic-parameters route and maps the catalog to the right value shape.
	const LOADERS = [
		['getMainIndustries', 'contactSearchCompanyMainIndustries', (d) => d.some((o) => o.value === '1')],
		['getSubIndustries', 'contactSearchCompanySubIndustries', (d) => d.some((o) => o.name === 'Hospitality: Other')],
		['getContactCountries', 'countries', (d) => d.some((o) => o.value === 'US')],
		['getCompanyCountries', 'companyCountries', (d) => d.some((o) => o.value === 'United States')],
		['getDepartments', 'departments', (d) => d.some((o) => o.value === 'Sales')],
		// seniorityIds must be integers, not strings.
		['getSeniorities', 'seniorities', (d) => d.every((o) => typeof o.value === 'number')],
	];
	for (const [methodName, path, ok] of LOADERS) {
		const res = await api('/rest/dynamic-node-parameters/options', {
			method: 'POST',
			body: JSON.stringify({
				nodeTypeAndVersion: { name: 'CUSTOM.lusha', version: 1 },
				methodName,
				path: `parameters.${path}`,
				currentNodeParameters: { resource: 'contact', operation: 'prospectingContacts' },
				credentials: { lushaApi: { id: credentialId, name: 'E2E Lusha' } },
			}),
		});
		const data = res.json?.data;
		const good = res.status === 200 && Array.isArray(data) && data.length > 0 && ok(data);
		if (!good) failures++;
		console.log(`${good ? 'PASS' : 'FAIL'}  loadOptions ${methodName} (${Array.isArray(data) ? data.length : '-'} values)`);
		if (!good) console.log(`      ${JSON.stringify(data).slice(0, 200)}`);
	}

	for (const [name, parameters, opts = {}] of CASES) {
		await reset();
		const wf = workflowFor(name, parameters, credentialId);
		const created = await api('/rest/workflows', { method: 'POST', body: JSON.stringify(wf) });
		const workflowId = created.json?.data?.id;
		if (!workflowId) {
			failures++;
			console.log(`FAIL  ${name}: workflow create failed (${created.status})`);
			continue;
		}

		const run = await api(`/rest/workflows/${workflowId}/run`, {
			method: 'POST',
			body: JSON.stringify({ workflowData: { ...wf, id: workflowId }, triggerToStartFrom: { name: 'When clicking Test' } }),
		});
		const executionId = run.json?.data?.executionId;
		if (!executionId) {
			failures++;
			console.log(`FAIL  ${name}: run rejected (${run.status}) ${run.text.slice(0, 160)}`);
			continue;
		}

		// Manual executions are async.
		let execution = null;
		for (let attempt = 0; attempt < 80; attempt++) {
			await new Promise((r) => setTimeout(r, 250));
			const res = await api(`/rest/executions/${executionId}`);
			execution = res.json?.data;
			if (execution && execution.status !== 'running' && execution.status !== 'new') break;
		}
		if (!execution) {
			failures++;
			console.log(`FAIL  ${name}: execution ${executionId} never settled`);
			continue;
		}

		const data = typeof execution.data === 'string' ? reviveFlatted(execution.data) : execution.data;
		const resultData = (Array.isArray(data) ? data[0] : data)?.resultData;
		const nodeRun = resultData?.runData?.Lusha?.[0];
		const error = resultData?.error?.message || nodeRun?.error?.message || null;
		const requests = await captured();

		if (opts.expectFail) {
			const ok = execution.status === 'error' && error && opts.expectFail.test(error) && requests.length === 0;
			if (!ok) failures++;
			console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
			console.log(`      status=${execution.status} requests=${requests.length} error=${error || '(none)'}`);
			continue;
		}

		if (error) { failures++; console.log(`FAIL  ${name}: ${error}`); continue; }
		if (!requests.length) { failures++; console.log(`FAIL  ${name}: no request reached the API`); continue; }

		const problems = [];
		const final = requests[requests.length - 1];
		if (opts.expectUrl && final.url !== opts.expectUrl) problems.push(`expected ${opts.expectUrl}, got ${final.url}`);
		if (opts.expectCalls && requests.length !== opts.expectCalls) problems.push(`expected ${opts.expectCalls} calls, got ${requests.length}`);
		for (const r of requests) {
			if (r.apiKeyHeader !== 'e2e-mock-key') problems.push(`missing api_key on ${r.url}`);
			if (r.prtnr !== 'n8n_connector-prod') problems.push(`missing prtnr on ${r.url}`);
			// The stand-in validates against the published request schemas, so an
			// unknown or mistyped field fails here rather than in production.
			if (r.method === 'POST' && !r.schemaChecked) {
				problems.push(`${r.url} was not schema-checked -- no schema is bundled for it`);
			}
			for (const v of r.violations || []) problems.push(`${r.url} rejected: ${v}`);
		}
		if (opts.check) {
			const problem = opts.check(final.body);
			if (problem) problems.push(problem);
		}
		if (opts.expectBulkReport) {
			const report = nodeRun?.data?.main?.[0]?.[0]?.json?.lushaBulkEnrich;
			if (!report) problems.push('lushaBulkEnrich report missing');
			else {
				if (report.requested !== opts.expectBulkReport.requested) problems.push(`requested=${report.requested}`);
				if ((report.unmatched || []).length !== opts.expectBulkReport.unmatched) problems.push(`unmatched=${(report.unmatched || []).length}`);
			}
		}

		if (problems.length) {
			failures++;
			console.log(`FAIL  ${name}`);
			problems.forEach((p) => console.log(`      - ${p}`));
			console.log(`      body: ${JSON.stringify(final.body).slice(0, 400)}`);
		} else {
			console.log(`PASS  ${name}  (${requests.map((r) => r.url).join(' -> ')})`);
		}
	}

	console.log(`\n${failures === 0 ? 'all checks passed' : `${failures} check(s) failed`}`);
	process.exit(failures ? 1 : 0);
})().catch((err) => {
	console.error(err);
	process.exit(1);
});

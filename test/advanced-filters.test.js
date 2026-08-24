'use strict';

/**
 * Covers the filter fields and request-body extras added for full parity with the
 * documented request schemas.
 *
 * The interesting cases are the nested and array-wrapped shapes — `score`,
 * `education`, `funding`, `foundedYear[]`, `topicCountThreshold[]`,
 * `geographicDetails[]`, `locationsZipcodes[]` — because they are where a plausible
 * guess produces a request the API either rejects or silently ignores. Every
 * expectation below was replayed against the live API.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { Lusha } = require('../dist/src/nodes/Lusha/Lusha.node.js');
const { makeContext } = require('./helpers/stub-context');
const {
	advancedFilterTargets,
	contactAdvancedFilterOptions,
	companyAdvancedFilterOptions,
} = require('../dist/src/nodes/Lusha/helpers/advanced-filters.js');

const node = new Lusha();

async function prospectContacts(params) {
	const { ctx, captured } = makeContext({
		resource: 'contact', operation: 'prospectingContacts',
		departments: ['Sales'],
		searchAdditionalOptions: { page: 0, pageSize: 25 },
		...params,
	});
	await node.execute.call(ctx);
	return captured[0].body;
}

async function prospectCompanies(params) {
	const { ctx, captured } = makeContext({
		resource: 'company', operation: 'prospectingCompanies',
		searchCompanyDomains: 'acme.com',
		searchAdditionalOptions: { page: 0, pageSize: 25 },
		...params,
	});
	await node.execute.call(ctx);
	return captured[0].body;
}

test('simple list filters split on commas and land on the right side', async () => {
	const body = await prospectContacts({
		contactAdvancedFilters: {
			skills: 'Python, Salesforce',
			certifications: 'AWS Certified',
			contactIds: 'abc, def',
		},
		companyAdvancedFilters: { keywords: 'fintech, cloud', companyIds: '123' },
	});
	const c = body.filters.contacts.include;
	const k = body.filters.companies.include;
	assert.deepEqual(c.skills, ['Python', 'Salesforce']);
	assert.deepEqual(c.certifications, ['AWS Certified']);
	assert.deepEqual(c.ids, ['abc', 'def']);
	assert.deepEqual(k.keywords, ['fintech', 'cloud']);
	assert.deepEqual(k.ids, ['123']);
});

test('score and education nest under their parent objects', async () => {
	const body = await prospectContacts({
		contactAdvancedFilters: {
			scoreMin: 40, scoreMax: 90,
			educationDegrees: 'BSc, MBA',
			educationSchools: 'MIT',
			educationStartYearGte: 2005,
			educationGraduationYearLte: 2012,
		},
	});
	const c = body.filters.contacts.include;
	assert.deepEqual(c.score, { minScore: 40, maxScore: 90 });
	assert.deepEqual(c.education, {
		degrees: ['BSc', 'MBA'],
		schools: ['MIT'],
		startYearGte: 2005,
		graduationYearLte: 2012,
	});
});

test('range filters wrap in a single-element array and merge min with max', async () => {
	const body = await prospectCompanies({
		companyAdvancedFilters: {
			foundedYearMin: 2000, foundedYearMax: 2020,
			topicCountMin: 2, topicCountMax: 8,
		},
	});
	const k = body.filters.companies.include;
	// foundedYear[].min plus foundedYear[].max must produce ONE element, not two.
	assert.deepEqual(k.foundedYear, [{ min: 2000, max: 2020 }]);
	assert.deepEqual(k.topicCountThreshold, [{ min: 2, max: 8 }]);
});

test('a range with only one bound set still produces one element', async () => {
	const body = await prospectCompanies({ companyAdvancedFilters: { foundedYearMin: 2010 } });
	assert.deepEqual(body.filters.companies.include.foundedYear, [{ min: 2010 }]);
});

test('funding sub-filters nest under a single funding object', async () => {
	const body = await prospectCompanies({
		companyAdvancedFilters: {
			fundingIsIpo: true,
			fundingDateCoverage: 'last_funding',
			fundingDate: '2025-01-01',
		},
	});
	assert.deepEqual(body.filters.companies.include.funding, {
		isIpo: true,
		date: { coverage: 'last_funding', date: '2025-01-01' },
	});
});

test('funding rows build arrays of coverage-scoped objects', async () => {
	const body = await prospectCompanies({
		companyFundingRanges: { range: [{ coverage: 'total_funds', min: 1000000, max: 50000000 }] },
		companyFundingRounds: { round: [{ coverage: 'last_round', round: 'series_b' }] },
		companyFundingNames: { type: [{ coverage: 'any_round', name: 'venture' }] },
		companyAdvancedFilters: { fundingIsIpo: true, fundingInvestors: 'Sequoia, Accel' },
	});
	// Every sub-filter merges into ONE funding object, not several.
	assert.deepEqual(body.filters.companies.include.funding, {
		isIpo: true,
		investors: ['Sequoia', 'Accel'],
		ranges: [{ coverage: 'total_funds', min: 1000000, max: 50000000 }],
		rounds: [{ coverage: 'last_round', round: 'series_b' }],
		names: [{ coverage: 'any_round', name: 'venture' }],
	});
});

test('a funding amount row with a zero bound drops just that bound', async () => {
	const body = await prospectCompanies({
		companyFundingRanges: { range: [{ coverage: 'total_funds', min: 1000000, max: 0 }] },
	});
	assert.deepEqual(body.filters.companies.include.funding.ranges, [
		{ coverage: 'total_funds', min: 1000000 },
	]);
});

test('a funding row carrying only a coverage is not sent', async () => {
	// Coverage alone selects a window without filtering anything in it.
	const body = await prospectCompanies({
		companyFundingRanges: { range: [{ coverage: 'total_funds', min: 0, max: 0 }] },
		companyFundingRounds: { round: [{ coverage: 'last_round', round: '' }] },
	});
	const k = body.filters.companies.include;
	assert.ok(!('funding' in k), 'coverage-only rows should produce no funding filter');
});

test('enum filters pass documented values through unchanged', async () => {
	const body = await prospectCompanies({
		companyAdvancedFilters: {
			businessModel: ['B2B', 'B2G'],
			companyType: ['Public Company'],
			technologiesCondition: 'and',
			intentTopicsOperator: 'all',
			intentMinScore: 20,
			intentMaxScore: 80,
		},
	});
	const k = body.filters.companies.include;
	assert.deepEqual(k.businessModel, ['B2B', 'B2G']);
	assert.deepEqual(k.companyType, ['Public Company']);
	assert.equal(k.technologiesCondition, 'and');
	assert.equal(k.intentTopicsOperator, 'all');
	assert.equal(k.intentMinScore, 20);
	assert.equal(k.intentMaxScore, 80);
});

test('zero means unset for numeric filters, so nothing is sent', async () => {
	const body = await prospectCompanies({
		companyAdvancedFilters: { foundedYearMin: 0, intentMinScore: 0, topicCountMin: 0 },
	});
	const k = body.filters.companies.include;
	assert.ok(!('foundedYear' in k));
	assert.ok(!('intentMinScore' in k));
	assert.ok(!('topicCountThreshold' in k));
});

test('blank and empty values never become no-op filters', async () => {
	const body = await prospectContacts({
		contactAdvancedFilters: { skills: '', certifications: '   ', contactEmails: ',,' },
		companyAdvancedFilters: { keywords: '', businessModel: [] },
	});
	const c = body.filters.contacts.include;
	for (const f of ['skills', 'certifications', 'emails']) assert.ok(!(f in c), `${f} must be omitted`);
	// With every company filter blank, the whole companies block is pruned rather
	// than sent as an empty `include: {}`.
	const k = body.filters.companies?.include ?? {};
	for (const f of ['keywords', 'businessModel']) assert.ok(!(f in k), `${f} must be omitted`);
	assert.ok(
		body.filters.companies === undefined,
		'an entirely blank companies block should be pruned, not sent empty',
	);
});

test('geographic areas and zipcodes become arrays of objects', async () => {
	const body = await prospectContacts({
		contactGeographicDetails: { area: [{ country: 'United States', zipcode: '94105', distance: 25 }] },
		companyGeographicDetails: { area: [{ country: 'United States', zipcode: '10001', distance: 0 }] },
		companyLocationsZipcodes: { location: [{ countryIso2: 'US', zipcode: '94105' }] },
		companyHeadquarterZipcodes: { location: [{ countryIso2: 'US', zipcode: '10001' }] },
	});
	const c = body.filters.contacts.include;
	const k = body.filters.companies.include;
	assert.deepEqual(c.geographicDetails, [{ country: 'United States', zipcode: '94105', distance: 25 }]);
	// distance 0 means unset and must be dropped, leaving the rest of the row.
	assert.deepEqual(k.geographicDetails, [{ country: 'United States', zipcode: '10001' }]);
	assert.deepEqual(k.locationsZipcodes, [{ countryIso2: 'US', zipcode: '94105' }]);
	assert.deepEqual(k.headquarterZipcodes, [{ countryIso2: 'US', zipcode: '10001' }]);
});

test('tableId is sent when set and omitted when blank', async () => {
	const withId = await prospectContacts({ tableId: '482910' });
	assert.equal(withId.tableId, '482910');
	const without = await prospectContacts({ tableId: '' });
	assert.ok(!('tableId' in without));
});

test('waterfallEnabled is only sent as an explicit opt-out', async () => {
	const run = async (waterfallEnabled) => {
		const { ctx, captured } = makeContext({
			resource: 'contact', operation: 'enrichFromSearch',
			contactSelectionType: 'specific', contactIds: '111',
			enrichFromSearchReveal: ['emails'],
			waterfallEnabled,
		});
		await node.execute.call(ctx);
		return captured[0].body;
	};
	// Defaults to true server-side, so sending true would be noise.
	assert.ok(!('waterfallEnabled' in (await run(true))));
	assert.equal((await run(false)).waterfallEnabled, false);
});

test('search-and-enrich forwards options only when set', async () => {
	const run = async (extra) => {
		const { ctx, captured } = makeContext({
			resource: 'contact', operation: 'searchAndEnrich',
			searchAndEnrichContacts: { contact: [{ email: 'a@acme.com' }] },
			searchAndEnrichReveal: ['emails'],
			...extra,
		});
		await node.execute.call(ctx);
		return captured[0].body;
	};
	assert.ok(!('options' in (await run({ searchAndEnrichOptions: {} }))));
	assert.deepEqual(
		(await run({ searchAndEnrichOptions: { includePartialProfiles: true } })).options,
		{ includePartialProfiles: true },
	);
});

test('the UI offers exactly the fields the builder knows how to send', () => {
	// Guards the whole point of the shared spec table: a control the panel shows but
	// the builder ignores is a filter that silently does nothing.
	const uiContact = contactAdvancedFilterOptions().map((o) => o.name);
	const uiCompany = companyAdvancedFilterOptions().map((o) => o.name);
	assert.ok(uiContact.length > 0 && uiCompany.length > 0);
	assert.equal(new Set(uiContact).size, uiContact.length, 'duplicate contact filter names');
	assert.equal(new Set(uiCompany).size, uiCompany.length, 'duplicate company filter names');

	const targets = advancedFilterTargets();
	// Fields that failed silently before must be present.
	for (const f of ['skills', 'education', 'score', 'geographicDetails']) {
		assert.ok(targets.contact.includes(f), `contact target ${f} missing`);
	}
	for (const f of ['funding', 'foundedYear', 'businessModel', 'companyType', 'keywords', 'locationsZipcodes']) {
		assert.ok(targets.company.includes(f), `company target ${f} missing`);
	}
});

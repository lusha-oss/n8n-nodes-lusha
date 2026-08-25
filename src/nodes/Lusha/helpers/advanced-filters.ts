import { IDataObject, INodeProperties } from 'n8n-workflow';

/**
 * The prospecting filter fields that were not previously reachable through the node.
 *
 * The UI properties and the request-building logic are both generated from the single
 * SPEC table below, so a field cannot exist in the panel without being sent, or be
 * sent under a name the panel does not offer. That drift is exactly what produced the
 * `sicsCodes` and company-`countries` bugs, where the dropdown looked fine and the
 * request was rejected or silently ignored.
 *
 * Field names, types and enums come from V3ContactFilterCriteria and
 * V3CompanyFilterCriteria in the v3 OpenAPI description.
 */

type Kind =
	| 'stringList' // comma-separated input -> string[]
	| 'date' // YYYY-MM-DD -> string
	| 'number' // -> number
	| 'boolean' // -> boolean
	| 'options' // single choice -> string
	| 'multiOptions'; // multiple choice -> string[]

/** Which prospecting endpoint a company-side filter is accepted by. */
export type Endpoint = 'contactsProspecting' | 'companiesProspecting';

interface FilterSpec {
	/** n8n parameter name, unique within its collection. */
	name: string;
	displayName: string;
	kind: Kind;
	/**
	 * Where the value lands in the request. A dotted path is nested, and a `[]`
	 * suffix on a segment means "wrap in a single-element array" (the API models
	 * several single ranges as arrays of one).
	 */
	target: string;
	description?: string;
	placeholder?: string;
	choices?: Array<{ name: string; value: string }>;
	min?: number;
	max?: number;
	/** Documented as only meaningful alongside a base filter such as jobTitles. */
	refinementOnly?: boolean;
	/**
	 * The two prospecting endpoints do NOT take the same company filters, even
	 * though both nest them under `filters.companies.include`. `funding` and
	 * `industriesLabels` exist only on contacts/prospecting; sending them to
	 * companies/prospecting is a 400. Omit to offer a filter on both.
	 */
	only?: Endpoint;
}

const CONTACT_SPEC: FilterSpec[] = [
	{ name: 'contactNames', displayName: 'Contact Names', kind: 'stringList', target: 'names',
	  description: 'Full or partial contact names', placeholder: 'Jane Doe, John Smith' },
	{ name: 'jobTitlesExactMatch', displayName: 'Job Titles (Exact Match)', kind: 'stringList', target: 'jobTitlesExactMatch',
	  description: 'Match these job titles exactly, rather than as a partial match', placeholder: 'VP Sales' },
	{ name: 'normalizedJobTitles', displayName: 'Job Titles (Normalized)', kind: 'stringList', target: 'normalizedJobTitles',
	  description: "Match against Lusha's normalized job-title taxonomy", placeholder: 'sales_vp' },
	{ name: 'contactLinkedinUrls', displayName: 'LinkedIn URLs', kind: 'stringList', target: 'linkedinUrls',
	  placeholder: 'https://www.linkedin.com/in/janedoe' },
	{ name: 'contactEmails', displayName: 'Emails', kind: 'stringList', target: 'emails',
	  description: 'Personal data — there is no catalog for this filter', placeholder: 'jane@acme.com' },
	{ name: 'contactPreviousEmails', displayName: 'Previous Emails', kind: 'stringList', target: 'previousEmails',
	  description: 'Personal data — there is no catalog for this filter' },
	{ name: 'previousJobTitle', displayName: 'Previous Job Titles', kind: 'stringList', target: 'previousJobTitle',
	  placeholder: 'Sales Manager' },
	{ name: 'skills', displayName: 'Skills', kind: 'stringList', target: 'skills', placeholder: 'Python, Salesforce' },
	{ name: 'certifications', displayName: 'Certifications', kind: 'stringList', target: 'certifications', placeholder: 'AWS Certified' },
	{ name: 'awards', displayName: 'Awards', kind: 'stringList', target: 'awards' },
	{ name: 'contactIds', displayName: 'Lusha Contact IDs', kind: 'stringList', target: 'ids',
	  description: "Encrypted contact IDs taken from a previous search's results[].id. Arbitrary strings are rejected with \"Invalid contact id\"." },
	{ name: 'jobChangedAfterDate', displayName: 'Job Changed After', kind: 'date', target: 'jobChangedAfterDate',
	  refinementOnly: true, placeholder: '2025-01-01' },
	{ name: 'jobChangedLastViewDate', displayName: 'Job Changed Since Last View', kind: 'date', target: 'jobChangedLastViewDate',
	  refinementOnly: true, placeholder: '2025-01-01' },
	{ name: 'scoreMin', displayName: 'Contact Score Min', kind: 'number', target: 'score.minScore',
	  min: 0, max: 100, refinementOnly: true,
	  description: 'Raw 0–100 contact score. Distinct from the A+/A confidence band on enriched contacts, which is derived from it.' },
	{ name: 'scoreMax', displayName: 'Contact Score Max', kind: 'number', target: 'score.maxScore',
	  min: 0, max: 100, refinementOnly: true },
	{ name: 'educationDegrees', displayName: 'Education — Degrees', kind: 'stringList', target: 'education.degrees',
	  refinementOnly: true, placeholder: 'BSc, MBA' },
	{ name: 'educationFieldsOfStudy', displayName: 'Education — Fields of Study', kind: 'stringList', target: 'education.fieldsOfStudy',
	  refinementOnly: true, placeholder: 'Computer Science' },
	{ name: 'educationSchools', displayName: 'Education — Schools', kind: 'stringList', target: 'education.schools',
	  refinementOnly: true },
	{ name: 'educationStartYearGte', displayName: 'Education — Started In or After', kind: 'number', target: 'education.startYearGte',
	  refinementOnly: true },
	{ name: 'educationGraduationYearLte', displayName: 'Education — Graduated In or Before', kind: 'number', target: 'education.graduationYearLte',
	  refinementOnly: true },
];

const COVERAGE = [
	{ name: 'Last Funding', value: 'last_funding' },
	{ name: 'Any Round', value: 'any_round' },
	{ name: 'Total Funds', value: 'total_funds' },
	{ name: 'Last Round', value: 'last_round' },
];

const COMPANY_SPEC: FilterSpec[] = [
	{ name: 'companyIds', displayName: 'Lusha Company IDs', kind: 'stringList', target: 'ids',
	  description: 'Encrypted company IDs (vN.…) from a previous search, or legacy numeric IDs. Anything else is rejected.' },
	{ name: 'industriesLabels', displayName: 'Industry Labels', kind: 'stringList', target: 'industriesLabels',
	  only: 'contactsProspecting',
	  description: 'Free-text industry labels, as an alternative to the industry ID pickers', placeholder: 'Software, SaaS' },
	{ name: 'companyLinkedinUrls', displayName: 'Company LinkedIn URLs', kind: 'stringList', target: 'linkedinUrls',
	  placeholder: 'https://www.linkedin.com/company/acme' },
	{ name: 'keywords', displayName: 'Keywords', kind: 'stringList', target: 'keywords', placeholder: 'fintech, cloud' },
	{ name: 'exactKeywords', displayName: 'Keywords (Exact)', kind: 'stringList', target: 'exactKeywords' },
	{ name: 'keywordsSearchFields', displayName: 'Keyword Search Fields', kind: 'stringList', target: 'keywordsSearchFields',
	  description: 'Restrict keyword matching to specific fields' },
	{ name: 'specialities', displayName: 'Specialities', kind: 'stringList', target: 'specialities' },
	{ name: 'exactSpecialities', displayName: 'Specialities (Exact)', kind: 'stringList', target: 'exactSpecialities' },
	{ name: 'previousCompanyDomains', displayName: 'Previous Company Domains', kind: 'stringList', target: 'previousCompanyDomains' },
	{ name: 'previousCompanyNames', displayName: 'Previous Company Names', kind: 'stringList', target: 'previousCompanyNames' },
	{ name: 'businessModel', displayName: 'Business Model', kind: 'multiOptions', target: 'businessModel',
	  choices: [{ name: 'B2B', value: 'B2B' }, { name: 'B2C', value: 'B2C' }, { name: 'B2G', value: 'B2G' }] },
	{ name: 'companyType', displayName: 'Company Type', kind: 'multiOptions', target: 'companyType',
	  choices: [
		{ name: 'Educational', value: 'Educational' },
		{ name: 'Government', value: 'Government' },
		{ name: 'Non Profit', value: 'Non Profit' },
		{ name: 'Private Company', value: 'Private Company' },
		{ name: 'Public Company', value: 'Public Company' },
		{ name: 'Self Employed', value: 'Self Employed' },
	  ] },
	{ name: 'technologiesCondition', displayName: 'Technologies Match', kind: 'options', target: 'technologiesCondition',
	  choices: [{ name: 'Any of Them (OR)', value: 'or' }, { name: 'All of Them (AND)', value: 'and' }],
	  description: 'How to combine multiple Technologies values' },
	{ name: 'intentTopicsOperator', displayName: 'Intent Topics Match', kind: 'options', target: 'intentTopicsOperator',
	  choices: [
		{ name: 'Any (OR)', value: 'or' },
		{ name: 'All (AND)', value: 'and' },
		{ name: 'Any — Alias', value: 'any' },
		{ name: 'All — Alias', value: 'all' },
	  ],
	  description: 'Recommended over Intent Topics Condition. any/all are aliases for or/and.' },
	{ name: 'intentTopicsCondition', displayName: 'Intent Topics Condition (Legacy)', kind: 'options', target: 'intentTopicsCondition',
	  choices: [{ name: 'Any of Them (OR)', value: 'or' }, { name: 'All of Them (AND)', value: 'and' }],
	  description: 'Still accepted, but Intent Topics Match is the recommended field' },
	{ name: 'intentMinScore', displayName: 'Intent Score Min', kind: 'number', target: 'intentMinScore', min: 1, max: 100 },
	{ name: 'intentMaxScore', displayName: 'Intent Score Max', kind: 'number', target: 'intentMaxScore', min: 1, max: 100 },
	{ name: 'topicCountMin', displayName: 'Intent Topic Count Min', kind: 'number', target: 'topicCountThreshold[].min' },
	{ name: 'topicCountMax', displayName: 'Intent Topic Count Max', kind: 'number', target: 'topicCountThreshold[].max' },
	{ name: 'foundedYearMin', displayName: 'Founded Year From', kind: 'number', target: 'foundedYear[].min', placeholder: '2000' },
	{ name: 'foundedYearMax', displayName: 'Founded Year To', kind: 'number', target: 'foundedYear[].max', placeholder: '2020' },
	{ name: 'fundingIsIpo', displayName: 'Funding — Is IPO', kind: 'boolean', target: 'funding.isIpo',
	  only: 'contactsProspecting' },
	{ name: 'fundingInvestors', displayName: 'Funding — Investors', kind: 'stringList', target: 'funding.investors',
	  only: 'contactsProspecting',
	  description: 'Free text. The API accepts this but the documentation notes it is not currently applied downstream.',
	  placeholder: 'Sequoia, Accel' },
	{ name: 'fundingDateCoverage', displayName: 'Funding — Date Coverage', kind: 'options', target: 'funding.date.coverage',
	  choices: COVERAGE, only: 'contactsProspecting' },
	{ name: 'fundingDate', displayName: 'Funding — Date', kind: 'date', target: 'funding.date.date',
	  placeholder: '2025-01-01', only: 'contactsProspecting' },
];

/** Turn one spec entry into an n8n property definition. */
function toProperty(f: FilterSpec): INodeProperties {
	const description = [
		f.description,
		f.refinementOnly ? 'Refinement-only: the API requires this to be paired with a base filter such as Job Titles.' : null,
	].filter(Boolean).join(' ');

	const base = {
		displayName: f.displayName,
		name: f.name,
		description: description || undefined,
		...(f.placeholder ? { placeholder: f.placeholder } : {}),
	};

	switch (f.kind) {
		case 'stringList':
			return { ...base, type: 'string', default: '',
				description: [description, 'Comma-separated.'].filter(Boolean).join(' ') } as INodeProperties;
		case 'date':
			return { ...base, type: 'string', default: '',
				description: [description, 'Format YYYY-MM-DD.'].filter(Boolean).join(' ') } as INodeProperties;
		case 'number':
			return { ...base, type: 'number', default: 0,
				...(f.min !== undefined || f.max !== undefined
					? { typeOptions: { ...(f.min !== undefined ? { minValue: f.min } : {}), ...(f.max !== undefined ? { maxValue: f.max } : {}) } }
					: {}) } as INodeProperties;
		case 'boolean':
			return { ...base, type: 'boolean', default: false } as INodeProperties;
		case 'options':
			return { ...base, type: 'options', options: f.choices ?? [], default: '' } as INodeProperties;
		case 'multiOptions':
			return { ...base, type: 'multiOptions', options: f.choices ?? [], default: [] } as INodeProperties;
	}
}

export function contactAdvancedFilterOptions(): INodeProperties[] {
	return CONTACT_SPEC.map(toProperty);
}

export function companyAdvancedFilterOptions(endpoint?: Endpoint): INodeProperties[] {
	return COMPANY_SPEC.filter((spec) => inScope(spec, endpoint)).map(toProperty);
}

/** A spec with no `only` is accepted everywhere; otherwise the endpoint must match. */
function inScope(spec: FilterSpec, endpoint?: Endpoint): boolean {
	return !spec.only || !endpoint || spec.only === endpoint;
}

const splitList = (raw: unknown): string[] =>
	String(raw).split(',').map((s) => s.trim()).filter((s) => s);

/**
 * Keys that would let a write escape the object it is aimed at and reach
 * Object.prototype. Every `target` here comes from the SPEC tables above rather
 * than from user input, so this is defence in depth — but `assign` walks a
 * dotted path and writes into whatever it finds, and a spec entry added later
 * should not be able to poison every object in the process.
 */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Write `value` into `target`, creating nested objects and single-element arrays. */
function assign(root: IDataObject, target: string, value: unknown): void {
	const segments = target.split('.');
	let cursor: IDataObject = root;
	for (let i = 0; i < segments.length; i++) {
		const isLast = i === segments.length - 1;
		const wrapInArray = segments[i].endsWith('[]');
		const key = wrapInArray ? segments[i].slice(0, -2) : segments[i];
		if (UNSAFE_KEYS.has(key)) return;

		if (isLast) {
			if (wrapInArray) {
				const existing = Array.isArray(cursor[key]) ? (cursor[key] as IDataObject[]) : [];
				if (!existing.length) existing.push({});
				// Range-style arrays: merge min and max into the same element.
				existing[0] = { ...existing[0], ...(value as IDataObject) };
				cursor[key] = existing;
			} else {
				cursor[key] = value as IDataObject;
			}
			return;
		}

		if (wrapInArray) {
			const existing = Array.isArray(cursor[key]) ? (cursor[key] as IDataObject[]) : [];
			if (!existing.length) existing.push({});
			cursor[key] = existing;
			cursor = existing[0];
		} else {
			if (typeof cursor[key] !== 'object' || cursor[key] === null) cursor[key] = {};
			cursor = cursor[key] as IDataObject;
		}
	}
}

/**
 * Copy whatever the user set in a collection into the include block. Only keys the
 * user actually added are present, so absence means "not filtering on this" — an
 * empty string or empty array is skipped rather than sent as a no-op filter.
 */
function applySpec(spec: FilterSpec[], collected: IDataObject, include: IDataObject): void {
	for (const f of spec) {
		const raw = collected[f.name];
		if (raw === undefined || raw === null || raw === '') continue;

		let value: unknown;
		switch (f.kind) {
			case 'stringList': {
				const list = splitList(raw);
				if (!list.length) continue;
				value = list;
				break;
			}
			case 'multiOptions': {
				const list = (Array.isArray(raw) ? raw : [raw]).map(String).filter((v) => v);
				if (!list.length) continue;
				value = list;
				break;
			}
			case 'number': {
				const n = Number(raw);
				if (!Number.isFinite(n)) continue;
				// 0 means "unset" for every numeric filter here: intent scores start at 1,
				// years and topic counts are never legitimately 0, and a contact score
				// floor of 0 is the same as not filtering on it.
				if (n === 0) continue;
				value = n;
				break;
			}
			case 'boolean':
				value = Boolean(raw);
				break;
			default:
				value = String(raw);
		}

		// assign() understands both nesting and the `[]` array-wrapping marker, so a
		// scalar is all that needs passing: `foundedYear[].min` becomes
		// `foundedYear: [{ min }]`, and a sibling `max` merges into the same element.
		assign(include, f.target, value);
	}
}

export function applyContactAdvancedFilters(collected: IDataObject, include: IDataObject): void {
	applySpec(CONTACT_SPEC, collected, include);
}

export function applyCompanyAdvancedFilters(
	collected: IDataObject,
	include: IDataObject,
	endpoint?: Endpoint,
): void {
	// Filtered again here, not just in the UI: a workflow saved before a field was
	// scoped would still carry the value, and sending it is a 400.
	applySpec(COMPANY_SPEC.filter((spec) => inScope(spec, endpoint)), collected, include);
}

/**
 * geographicDetails / locationsZipcodes / headquarterZipcodes are arrays of objects,
 * so they need repeating rows rather than a single collection entry. Each returns a
 * fixedCollection whose row shape matches the documented item schema exactly.
 */
function zipcodeRows(name: string, displayName: string, description: string, show: IDataObject): INodeProperties {
	return {
		displayName,
		name,
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add location',
		default: {},
		description,
		displayOptions: { show: show as never },
		options: [
			{
				name: 'location',
				displayName: 'Location',
				values: [
					{ displayName: 'Country ISO-2', name: 'countryIso2', type: 'string', default: '', placeholder: 'US' },
					{ displayName: 'Zip Code', name: 'zipcode', type: 'string', default: '', placeholder: '94105' },
				],
			},
		],
	};
}

function geoRows(name: string, displayName: string, description: string, show: IDataObject): INodeProperties {
	return {
		displayName,
		name,
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add area',
		default: {},
		description,
		displayOptions: { show: show as never },
		options: [
			{
				name: 'area',
				displayName: 'Area',
				values: [
					{ displayName: 'Country', name: 'country', type: 'string', default: '', placeholder: 'United States' },
					{ displayName: 'Zip Code', name: 'zipcode', type: 'string', default: '', placeholder: '94105' },
					{ displayName: 'Distance (Miles)', name: 'distance', type: 'number', default: 0,
					  description: 'Search radius in miles around the zip code' },
				],
			},
		],
	};
}

export function geographicFilterProperties(): INodeProperties[] {
	return [
		geoRows('contactGeographicDetails', 'Contact Geographic Areas',
			'Radius search around a zip code, applied to the contact location',
			{ resource: ['contact'], operation: ['prospectingContacts'] }),
		geoRows('companyGeographicDetails', 'Company Geographic Areas',
			'Radius search around a zip code, applied to the company location',
			{ resource: ['contact', 'company'], operation: ['prospectingContacts', 'prospectingCompanies'] }),
		zipcodeRows('companyLocationsZipcodes', 'Company Location Zip Codes',
			'Match companies with any office in these zip codes',
			{ resource: ['contact', 'company'], operation: ['prospectingContacts', 'prospectingCompanies'] }),
		zipcodeRows('companyHeadquarterZipcodes', 'Company Headquarter Zip Codes',
			'Match companies whose headquarters are in these zip codes',
			{ resource: ['contact', 'company'], operation: ['prospectingContacts', 'prospectingCompanies'] }),
	];
}

/** Numeric row fields, where 0 means "unset" rather than a real bound. */
const NUMERIC_ROW_FIELDS = new Set(['distance', 'min', 'max']);

/** Rows -> array of objects, dropping blanks and zeroed numeric bounds. */
function collectRows(value: IDataObject, rowKey: string, fields: string[]): IDataObject[] {
	const rows = (value?.[rowKey] as IDataObject[] | undefined) ?? [];
	const out: IDataObject[] = [];
	for (const row of rows) {
		const item: IDataObject = {};
		for (const f of fields) {
			const v = row?.[f];
			if (v === undefined || v === null || v === '') continue;
			if (NUMERIC_ROW_FIELDS.has(f)) {
				const n = Number(v);
				if (!Number.isFinite(n) || n === 0) continue;
				item[f] = n;
			} else {
				item[f] = String(v).trim();
			}
		}
		if (Object.keys(item).length) out.push(item);
	}
	return out;
}

export function applyGeographicFilters(
	collected: { contactGeo?: IDataObject; companyGeo?: IDataObject; locationsZip?: IDataObject; hqZip?: IDataObject },
	contactInclude: IDataObject | null,
	companiesInclude: IDataObject | null,
): void {
	if (contactInclude && collected.contactGeo) {
		const rows = collectRows(collected.contactGeo, 'area', ['country', 'zipcode', 'distance']);
		if (rows.length) contactInclude.geographicDetails = rows;
	}
	if (!companiesInclude) return;
	if (collected.companyGeo) {
		const rows = collectRows(collected.companyGeo, 'area', ['country', 'zipcode', 'distance']);
		if (rows.length) companiesInclude.geographicDetails = rows;
	}
	if (collected.locationsZip) {
		const rows = collectRows(collected.locationsZip, 'location', ['countryIso2', 'zipcode']);
		if (rows.length) companiesInclude.locationsZipcodes = rows;
	}
	if (collected.hqZip) {
		const rows = collectRows(collected.hqZip, 'location', ['countryIso2', 'zipcode']);
		if (rows.length) companiesInclude.headquarterZipcodes = rows;
	}
}

const FUNDING_ROUNDS = [
	'pre_seed', 'seed', 'series_a', 'series_b', 'series_c',
	'series_d', 'series_e', 'series_f', 'series_g', 'series_h', 'other',
].map((v) => ({ name: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), value: v }));

const FUNDING_NAMES = [
	'angel', 'venture', 'private_equity', 'crowdfunding', 'grant', 'debt_financing', 'other',
].map((v) => ({ name: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), value: v }));

// `funding` is absent from the companies/prospecting request schema, so these rows
// belong to Prospect Contacts only -- offering them on Prospect Companies would
// build a body the API answers with a 400.
const SHOW_CONTACT_PROSPECTING = {
	resource: ['contact'],
	operation: ['prospectingContacts'],
};

/**
 * funding.ranges / rounds / names are arrays of objects, each pairing a `coverage`
 * with its own payload, so they need repeating rows rather than collection entries.
 */
export function fundingRowProperties(): INodeProperties[] {
	const coverageField = {
		displayName: 'Coverage', name: 'coverage', type: 'options' as const,
		options: COVERAGE, default: 'any_round',
		description: 'Which funding event this row applies to',
	};
	return [
		{
			displayName: 'Funding — Amount Ranges',
			name: 'companyFundingRanges',
			type: 'fixedCollection',
			typeOptions: { multipleValues: true },
			placeholder: 'Add amount range',
			default: {},
			displayOptions: { show: SHOW_CONTACT_PROSPECTING as never },
			description: 'Filter by funding amount, per coverage window',
			options: [{
				name: 'range', displayName: 'Range',
				values: [
					coverageField,
					{ displayName: 'Min (USD)', name: 'min', type: 'number', default: 0 },
					{ displayName: 'Max (USD)', name: 'max', type: 'number', default: 0 },
				],
			}],
		},
		{
			displayName: 'Funding — Rounds',
			name: 'companyFundingRounds',
			type: 'fixedCollection',
			typeOptions: { multipleValues: true },
			placeholder: 'Add round',
			default: {},
			displayOptions: { show: SHOW_CONTACT_PROSPECTING as never },
			description: 'Filter by funding round, per coverage window',
			options: [{
				name: 'round', displayName: 'Round',
				values: [coverageField, { displayName: 'Round', name: 'round', type: 'options', options: FUNDING_ROUNDS, default: 'seed' }],
			}],
		},
		{
			displayName: 'Funding — Types',
			name: 'companyFundingNames',
			type: 'fixedCollection',
			typeOptions: { multipleValues: true },
			placeholder: 'Add funding type',
			default: {},
			displayOptions: { show: SHOW_CONTACT_PROSPECTING as never },
			description: 'Filter by funding type, per coverage window',
			options: [{
				name: 'type', displayName: 'Type',
				values: [coverageField, { displayName: 'Type', name: 'name', type: 'options', options: FUNDING_NAMES, default: 'venture' }],
			}],
		},
	];
}

export function applyFundingRows(
	collected: { ranges?: IDataObject; rounds?: IDataObject; names?: IDataObject },
	companiesInclude: IDataObject,
): void {
	const funding = (companiesInclude.funding as IDataObject) ?? {};

	const ranges = collectRows(collected.ranges ?? {}, 'range', ['coverage', 'min', 'max'])
		// A row with only a coverage and no bound carries no filter.
		.filter((r) => r.min !== undefined || r.max !== undefined);
	if (ranges.length) funding.ranges = ranges;

	const rounds = collectRows(collected.rounds ?? {}, 'round', ['coverage', 'round'])
		.filter((r) => r.round !== undefined);
	if (rounds.length) funding.rounds = rounds;

	const names = collectRows(collected.names ?? {}, 'type', ['coverage', 'name'])
		.filter((r) => r.name !== undefined);
	if (names.length) funding.names = names;

	if (Object.keys(funding).length) companiesInclude.funding = funding;
}

/** Field names both specs cover, for tests and documentation. */
export function advancedFilterTargets(): { contact: string[]; company: string[] } {
	const root = (t: string) => t.split('.')[0].replace('[]', '');
	return {
		contact: [...new Set([...CONTACT_SPEC.map((f) => root(f.target)), 'geographicDetails'])],
		company: [...new Set([
			...COMPANY_SPEC.map((f) => root(f.target)),
			'geographicDetails', 'locationsZipcodes', 'headquarterZipcodes',
		])],
	};
}

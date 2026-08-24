'use strict';

/**
 * The filter dropdowns load their values from Lusha's discovery endpoints so they
 * cannot go stale. Two things must hold:
 *
 *  1. Live catalog responses are mapped to the shape each filter actually accepts —
 *     contact countries as ISO-2 codes, company countries as full names, seniority
 *     as integers. These are not interchangeable: a full name in contact `countries`
 *     is rejected outright, and `countryIso2` in company locations matches nothing.
 *
 *  2. When the call fails — no credentials in the editor, no network, API down — the
 *     dropdown must fall back to the bundled list rather than render empty. An empty
 *     dropdown is worse than a slightly stale one.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { Lusha } = require('../dist/src/nodes/Lusha/Lusha.node.js');
const options = require('../dist/src/nodes/Lusha/helpers/options.js');

const loadOptions = new Lusha().methods.loadOptions;

/** Context whose HTTP call returns `payload`, or throws when `payload` is an Error. */
function ctxReturning(payload) {
	return {
		helpers: {
			httpRequestWithAuthentication: {
				call() {
					if (payload instanceof Error) return Promise.reject(payload);
					return Promise.resolve(payload);
				},
			},
		},
	};
}

const INDUSTRIES = {
	values: [
		{
			main_industry: 'Hospitality',
			main_industry_id: 1,
			sub_industries: [
				{ value: 'Restaurants', id: 2 },
				{ value: 'Other', id: 778 },
			],
		},
		{
			main_industry: 'Healthcare',
			main_industry_id: 11,
			sub_industries: [
				{ value: 'Medical Practices', id: 65 },
				{ value: 'Other', id: 780 },
			],
		},
	],
};

const COUNTRIES = { values: [{ name: 'United States', code: 'US' }, { name: 'Canada', code: 'CA' }] };
const DEPARTMENTS = { values: ['Sales', 'Marketing'] };
const SENIORITY = { values: [{ id: 9, name: 'c-suite' }, { id: 5, name: 'manager' }] };

test('main industries map id -> value from the live catalog', async () => {
	const result = await loadOptions.getMainIndustries.call(ctxReturning(INDUSTRIES));
	assert.deepEqual(result, [
		{ name: 'Hospitality', value: '1' },
		{ name: 'Healthcare', value: '11' },
	]);
});

test('sub industries flatten, dedupe by id, and disambiguate repeated labels', async () => {
	const result = await loadOptions.getSubIndustries.call(ctxReturning(INDUSTRIES));
	// "Other" appears under both parents, so it must be parent-qualified. "Restaurants"
	// is unique and must be left alone.
	assert.deepEqual(result, [
		{ name: 'Restaurants', value: '2' },
		{ name: 'Hospitality: Other', value: '778' },
		{ name: 'Medical Practices', value: '65' },
		{ name: 'Healthcare: Other', value: '780' },
	]);
});

test('contact countries use ISO-2 codes, company countries use full names', async () => {
	const contact = await loadOptions.getContactCountries.call(ctxReturning(COUNTRIES));
	assert.deepEqual(contact, [
		{ name: 'United States', value: 'US' },
		{ name: 'Canada', value: 'CA' },
	]);

	const company = await loadOptions.getCompanyCountries.call(ctxReturning(COUNTRIES));
	assert.deepEqual(company, [
		{ name: 'United States', value: 'United States' },
		{ name: 'Canada', value: 'Canada' },
	]);
});

test('departments accept a bare string catalog', async () => {
	const result = await loadOptions.getDepartments.call(ctxReturning(DEPARTMENTS));
	assert.deepEqual(result, [
		{ name: 'Sales', value: 'Sales' },
		{ name: 'Marketing', value: 'Marketing' },
	]);
});

test('seniority values are integers, with our own label casing', async () => {
	const result = await loadOptions.getSeniorities.call(ctxReturning(SENIORITY));
	// seniorityIds is an integer array; the catalog's lowercase names are re-cased.
	assert.deepEqual(result, [
		{ name: 'C-Suite', value: 9 },
		{ name: 'Manager', value: 5 },
	]);
	for (const o of result) assert.equal(typeof o.value, 'number');
});

test('an unknown seniority id still renders with a title-cased label', async () => {
	const result = await loadOptions.getSeniorities.call(
		ctxReturning({ values: [{ id: 42, name: 'regional head of ops' }] }),
	);
	assert.deepEqual(result, [{ name: 'Regional Head Of Ops', value: 42 }]);
});

test('every loader falls back to the bundled list when the API call fails', async () => {
	const boom = new Error('401 unauthorized');
	const cases = [
		['getMainIndustries', options.getMainIndustryOptions()],
		['getSubIndustries', options.getSubIndustryOptions()],
		['getContactCountries', options.getContactCountryOptions()],
		['getCompanyCountries', options.getCompanyCountryOptions()],
		['getDepartments', options.getDepartmentOptions()],
		['getSeniorities', options.getSeniorityOptions()],
	];
	for (const [method, fallback] of cases) {
		const result = await loadOptions[method].call(ctxReturning(boom));
		assert.deepEqual(result, fallback, `${method} must fall back to the bundled list`);
		assert.ok(result.length > 0, `${method} must never return an empty dropdown`);
	}
});

test('an empty or malformed catalog response also falls back', async () => {
	for (const payload of [{ values: [] }, {}, { values: null }, null]) {
		const result = await loadOptions.getDepartments.call(ctxReturning(payload));
		assert.deepEqual(result, options.getDepartmentOptions());
	}
});

test('the bundled fallbacks match what the API actually accepts', () => {
	// Regression guards for values that were wrong before and failed silently.
	const main = options.getMainIndustryOptions().map((o) => o.value);
	assert.equal(main.length, 17, 'Lusha exposes 17 main industries, not 20');
	for (const dead of ['2', '4', '20']) {
		assert.ok(!main.includes(dead), `industry id ${dead} does not exist and returns total=0`);
	}

	assert.equal(options.getSubIndustryOptions().length, 132);

	// seniorityIds must be integers, not strings.
	for (const o of options.getSeniorityOptions()) assert.equal(typeof o.value, 'number');

	// Contact countries are ISO-2; company countries are full names.
	assert.ok(options.getContactCountryOptions().every((o) => String(o.value).length === 2));
	assert.ok(options.getCompanyCountryOptions().some((o) => o.value === 'United States'));
});

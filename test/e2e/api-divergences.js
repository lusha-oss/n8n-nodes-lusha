'use strict';

/**
 * Places where the live API is stricter than the published OpenAPI document.
 *
 * Schema validation alone would wave these through, so each rule below was
 * established by replaying the request against the real API and recording what
 * came back. They are the cases that actually shipped as bugs or nearly did --
 * a request the document blesses and the API refuses (or silently ignores) is
 * exactly what a permissive mock cannot catch.
 *
 * Add a rule only with evidence from a live response, and say what that response
 * was, so a future reader can tell a measured divergence from a guess.
 */

const RULES = [
	{
		// The document lists countryIso2 on the shared location object, but company
		// prospecting answers 400. Contact prospecting accepts it and then matches
		// nothing (total=0, against 5,680,522 for {country: "United States"}) -- a
		// silent no-op, so it fails here on both endpoints rather than only one.
		why: 'company locations take a full country name; countryIso2 is refused by companies/prospecting and matches nothing on contacts/prospecting',
		appliesTo: ['/v3/contacts/prospecting', '/v3/companies/prospecting'],
		check(body) {
			const locations = body?.filters?.companies?.include?.locations;
			if (!Array.isArray(locations)) return null;
			return locations.some((l) => l && 'countryIso2' in l)
				? 'filters.companies.include.locations[].countryIso2 is not honoured -- use country with the full name'
				: null;
		},
	},
	{
		// work_phone appears in the document's own example for this field and is
		// rejected as an invalid value; work_email and phone are real.
		why: 'work_phone is not a valid existing data point despite appearing in the documented example',
		appliesTo: ['/v3/contacts/prospecting'],
		check(body) {
			const points = body?.filters?.contacts?.include?.existingDataPoints;
			if (!Array.isArray(points)) return null;
			return points.includes('work_phone')
				? 'filters.contacts.include.existingDataPoints must not contain work_phone'
				: null;
		},
	},
	{
		// The document gives companies/search the same signals object as contacts,
		// but maxResultsPerSignal is honoured only on the contact endpoint.
		why: 'signals.maxResultsPerSignal is contacts-only',
		appliesTo: ['/v3/companies/search'],
		check(body) {
			return body?.signals && 'maxResultsPerSignal' in body.signals
				? 'signals.maxResultsPerSignal is not supported on companies/search'
				: null;
		},
	},
];

/** Returns an array of violations for a body the document would allow. */
function checkDivergences(body, urlPath) {
	const out = [];
	for (const rule of RULES) {
		if (!rule.appliesTo.includes(urlPath)) continue;
		const problem = rule.check(body);
		if (problem) out.push(problem);
	}
	return out;
}

module.exports = { checkDivergences, RULES };

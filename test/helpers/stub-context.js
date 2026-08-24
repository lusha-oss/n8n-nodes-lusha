'use strict';

/**
 * Minimal stand-in for n8n's IExecuteFunctions, enough to drive Lusha.node's
 * execute() and capture the HTTP requests it builds without touching the network.
 *
 * The payloads asserted in request-shapes.test.js were captured from a real n8n
 * instance and then replayed against the live Lusha API, so they are known-good
 * rather than guesses. See test/e2e/ for the harness that proves this stub agrees
 * with n8n's own parameter resolution.
 */

const NODE = { name: 'Lusha', type: 'lusha', typeVersion: 1, position: [0, 0], parameters: {} };

/** Resolve a dotted path like 'collection.field', mirroring getNodeParameter. */
function lookup(params, path) {
	let cur = params;
	for (const key of path.split('.')) {
		if (cur === undefined || cur === null || typeof cur !== 'object') return undefined;
		cur = cur[key];
	}
	return cur;
}

/**
 * @param {object} params            node parameters, nested like the n8n UI stores them
 * @param {object[]} [inputJson]     input items (defaults to a single empty item)
 * @param {object[]} [responses]     scripted responses, consumed in order, for
 *                                   multi-call flows such as bulk search-then-enrich
 */
function makeContext(params, inputJson, responses) {
	const captured = [];
	const queue = [...(responses || [])];

	const ctx = {
		getInputData: () => inputJson || [{ json: {} }],
		getNode: () => NODE,
		continueOnFail: () => false,
		getNodeParameter(name, _itemIndex, fallback) {
			const value = lookup(params, name);
			if (value !== undefined) return value;
			// Match n8n: asking for a parameter that is not set — a collection key the
			// user never added, for instance — throws unless a concrete fallback was
			// given. Passing `undefined` does NOT count as providing one. Reproducing
			// this is the whole point; a permissive stub hid a real crash here once.
			if (fallback === undefined) {
				throw new Error(`Could not get parameter "${name}"`);
			}
			return fallback;
		},
		helpers: {
			httpRequestWithAuthentication: {
				call(_self, _credentialType, options) {
					captured.push(JSON.parse(JSON.stringify(options)));
					if (queue.length) return Promise.resolve(queue.shift());
					return Promise.resolve({ requestId: 'stub', results: [] });
				},
			},
		},
	};

	return { ctx, captured };
}

module.exports = { makeContext };

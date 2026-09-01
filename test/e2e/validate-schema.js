'use strict';

/**
 * A small JSON-Schema-subset validator, used by the e2e mock so the container
 * rejects the bodies the real API rejects.
 *
 * Two behaviours are deliberately stricter than the published document:
 *
 *  - Objects are CLOSED by default. The document rarely spells out
 *    `additionalProperties: false`, but the API validates with a whitelist and
 *    answers unknown fields with `property <name> should not exist`. Mirroring
 *    that is the whole point: `sicsCodes` and a company-side `countries` both
 *    shipped because a permissive mock waved them through.
 *  - A `$ref` cycle is cut during extraction and marked `x-recursive`; those
 *    nodes stay open, since there is no schema left to check against.
 *
 * Everything here is intentionally dependency-free -- it runs inside the n8n
 * container, which has no node_modules of its own.
 */

function typeOf(value) {
	if (value === null) return 'null';
	if (Array.isArray(value)) return 'array';
	return typeof value;
}

function matchesType(value, expected) {
	const actual = typeOf(value);
	if (expected === 'integer') return actual === 'number' && Number.isInteger(value);
	if (expected === 'number') return actual === 'number';
	return actual === expected;
}

function merged(schema) {
	// Flatten allOf so property/required checks see one combined object.
	if (!Array.isArray(schema.allOf)) return schema;
	const out = { ...schema, properties: { ...(schema.properties || {}) }, required: [...(schema.required || [])] };
	delete out.allOf;
	for (const part of schema.allOf) {
		const flat = merged(part);
		Object.assign(out, { ...flat, properties: undefined, required: undefined });
		Object.assign(out.properties, flat.properties || {});
		out.required.push(...(flat.required || []));
	}
	return out;
}

function validate(value, rawSchema, path, errors) {
	if (!rawSchema || typeof rawSchema !== 'object') return;
	const schema = merged(rawSchema);

	if (Array.isArray(schema.oneOf) || Array.isArray(schema.anyOf)) {
		const branches = schema.oneOf || schema.anyOf;
		const attempts = branches.map((branch) => {
			const sub = [];
			validate(value, branch, path, sub);
			return sub;
		});
		if (!attempts.some((sub) => sub.length === 0)) {
			errors.push(`${path || 'body'} matches none of the allowed shapes`);
		}
		return;
	}

	if (schema.type && !(schema.nullable && value === null)) {
		if (!matchesType(value, schema.type)) {
			errors.push(`${path || 'body'} should be ${schema.type}, got ${typeOf(value)}`);
			return; // Deeper checks would only produce noise off a wrong type.
		}
	}

	if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
		errors.push(`${path} must be one of [${schema.enum.join(', ')}], got ${JSON.stringify(value)}`);
	}

	if (typeof value === 'number') {
		if (schema.minimum !== undefined && value < schema.minimum) {
			errors.push(`${path} must not be less than ${schema.minimum}, got ${value}`);
		}
		if (schema.maximum !== undefined && value > schema.maximum) {
			errors.push(`${path} must not be greater than ${schema.maximum}, got ${value}`);
		}
	}

	if (typeof value === 'string') {
		if (schema.maxLength !== undefined && value.length > schema.maxLength) {
			errors.push(`${path} must be at most ${schema.maxLength} characters`);
		}
		if (schema.minLength !== undefined && value.length < schema.minLength) {
			errors.push(`${path} must be at least ${schema.minLength} characters`);
		}
	}

	if (Array.isArray(value)) {
		if (schema.maxItems !== undefined && value.length > schema.maxItems) {
			errors.push(`${path} must contain at most ${schema.maxItems} items, got ${value.length}`);
		}
		if (schema.minItems !== undefined && value.length < schema.minItems) {
			errors.push(`${path} must contain at least ${schema.minItems} items, got ${value.length}`);
		}
		if (schema.items) {
			value.forEach((item, i) => validate(item, schema.items, `${path}[${i}]`, errors));
		}
		return;
	}

	if (typeOf(value) === 'object') {
		for (const key of schema.required || []) {
			if (value[key] === undefined) errors.push(`${path ? path + '.' : ''}${key} should not be empty`);
		}
		const props = schema.properties || {};
		// An object with no declared properties describes a free-form map (or a cut
		// recursive ref), so there is nothing to close over.
		const closed = Object.keys(props).length > 0 && schema.additionalProperties !== true;
		for (const [key, sub] of Object.entries(value)) {
			const child = path ? `${path}.${key}` : key;
			if (props[key]) validate(sub, props[key], child, errors);
			else if (closed) errors.push(`property ${child} should not exist`);
		}
	}
}

/** Returns an array of human-readable violations; empty means the body is valid. */
function validateRequest(body, schema) {
	const errors = [];
	validate(body, schema, '', errors);
	return errors;
}

module.exports = { validateRequest };

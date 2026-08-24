#!/usr/bin/env python3
"""Distils the published OpenAPI document into the request schemas the node uses.

The e2e mock validates against the output, so the container rejects the same
bodies the real API rejects. Regenerate after a spec update:

    python3 test/e2e/build-schemas.py path/to/lusha-v3.yaml

Only the request side is kept, and only for endpoints the node actually calls --
the full document is ~340KB and most of it describes responses and endpoints the
node does not touch.
"""
import json
import re
import sys

import yaml

PATHS = [
    '/v3/contacts/search',
    '/v3/contacts/prospecting',
    '/v3/contacts/enrich',
    '/v3/contacts/search-and-enrich',
    '/v3/contacts/lookalike',
    '/v3/companies/search',
    '/v3/companies/prospecting',
    '/v3/companies/enrich',
    '/v3/companies/search-and-enrich',
    '/v3/companies/lookalike',
]

KEEP = {
    'type', 'properties', 'items', 'required', 'enum', 'minimum', 'maximum',
    'minLength', 'maxLength', 'minItems', 'maxItems', 'format', 'nullable',
    'oneOf', 'anyOf', 'allOf', 'additionalProperties', 'description',
}


def main():
    spec = yaml.safe_load(open(sys.argv[1] if len(sys.argv) > 1 else 'lusha-v3.yaml'))
    components = spec.get('components', {}).get('schemas', {})

    def resolve(node, seen=()):
        """Inline $refs, dropping the noise the validator has no use for."""
        if isinstance(node, list):
            return [resolve(n, seen) for n in node]
        if not isinstance(node, dict):
            return node
        if '$ref' in node:
            name = node['$ref'].rsplit('/', 1)[-1]
            if name in seen:  # a self-referential schema; stop at an open object
                return {'type': 'object', 'x-recursive': name}
            return resolve(components.get(name, {}), seen + (name,))
        out = {}
        for key, value in node.items():
            if key not in KEEP:
                continue
            if key == 'properties':
                # A map of property NAMES to schemas -- keep every key, resolve values.
                out[key] = {name: resolve(sub, seen) for name, sub in value.items()}
            elif key == 'description':
                # Kept only where it names allowed values the schema itself omits.
                if not re.search(r'one of|must be|allowed', str(value), re.I):
                    continue
                out[key] = ' '.join(str(value).split())[:200]
            else:
                out[key] = resolve(value, seen)
        return out

    bundle = {}
    for path in PATHS:
        node = spec.get('paths', {}).get(path, {}).get('post')
        if not node:
            print(f'  WARN no POST for {path}', file=sys.stderr)
            continue
        schema = (node.get('requestBody', {}).get('content', {})
                  .get('application/json', {}).get('schema'))
        if not schema:
            print(f'  WARN no request schema for {path}', file=sys.stderr)
            continue
        bundle[path] = resolve(schema)
        print(f'  {path}: {len(bundle[path].get("properties", {}))} top-level properties')

    out = 'test/e2e/schemas/lusha-v3-requests.json'
    with open(out, 'w') as fh:
        json.dump(bundle, fh, indent=1, sort_keys=True)
        fh.write('\n')
    print(f'wrote {out} ({len(bundle)} endpoints)')


if __name__ == '__main__':
    main()

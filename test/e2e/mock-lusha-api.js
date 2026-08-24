// Stands in for api.lusha.com inside the docker network so we can capture the
// exact request n8n's own execution engine emits, with no Lusha credits spent.
const https = require('https');
const fs = require('fs');

const captured = [];

const server = https.createServer(
	{
		key: fs.readFileSync('/certs/mock-key.pem'),
		cert: fs.readFileSync('/certs/mock-cert.pem'),
	},
	(req, res) => {
		let raw = '';
		req.on('data', (c) => (raw += c));
		req.on('end', () => {
			// Control plane for the test driver, not part of the emulated API.
			if (req.url === '/__captured') {
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify(captured));
				return;
			}
			if (req.url === '/__reset') {
				captured.length = 0;
				res.writeHead(200);
				res.end('ok');
				return;
			}

			let body = null;
			try {
				body = raw ? JSON.parse(raw) : null;
			} catch (e) {
				body = { __unparseable: raw };
			}

			captured.push({
				method: req.method,
				url: req.url,
				apiKeyHeader: req.headers.api_key ?? null,
				contentType: req.headers['content-type'] ?? null,
				prtnr: req.headers.prtnr ?? null,
				accept: req.headers.accept ?? null,
				body,
			});

			res.writeHead(200, { 'Content-Type': 'application/json' });

			// Filter-discovery catalogs, in the {values: [...]} envelope the real API
			// uses. Matched before /prospecting because these paths contain it.
			if (req.url.includes('/prospecting/filters/')) {
				if (req.url.endsWith('/seniority')) {
					res.end(JSON.stringify({ values: [{ id: 9, name: 'c-suite' }, { id: 5, name: 'manager' }] }));
					return;
				}
				if (req.url.endsWith('/departments')) {
					res.end(JSON.stringify({ values: ['Sales', 'Marketing'] }));
					return;
				}
				if (req.url.endsWith('/countries')) {
					res.end(JSON.stringify({ values: [{ name: 'United States', code: 'US' }, { name: 'Canada', code: 'CA' }] }));
					return;
				}
				if (req.url.endsWith('/industriesLabels')) {
					res.end(JSON.stringify({
						values: [
							{ main_industry: 'Hospitality', main_industry_id: 1, sub_industries: [{ value: 'Restaurants', id: 2 }, { value: 'Other', id: 778 }] },
							{ main_industry: 'Healthcare', main_industry_id: 11, sub_industries: [{ value: 'Medical Practices', id: 65 }, { value: 'Other', id: 780 }] },
						],
					}));
					return;
				}
				res.end(JSON.stringify({ values: [] }));
				return;
			}

			// Echo back a shape close enough to the real v3 responses that the
			// node's post-processing (allContactIds / newContactIds / the two-step
			// bulk correlation) actually runs instead of short-circuiting.
			if (req.url.includes('/contacts/search') && !req.url.includes('search-and-enrich')) {
				const reqs = (body && body.contacts) || [];
				// Deliberately drop the 2nd input so the unmatched-reporting path runs.
				const results = reqs
					.filter((_, i) => i !== 1)
					.map((c, i) => ({
						clientReferenceId: c.clientReferenceId,
						id: `900${i}`,
						firstName: 'Mock',
						lastName: 'Contact',
						canReveal: [
							{ field: 'emails', credits: 1 },
							{ field: 'phones', credits: 0 },
						],
					}));
				res.end(JSON.stringify({ requestId: 'mock-search', results }));
				return;
			}
			if (req.url.includes('/companies/search') && !req.url.includes('search-and-enrich')) {
				const reqs = (body && body.companies) || [];
				const results = reqs
					.filter((_, i) => i !== 1)
					.map((c, i) => ({ clientReferenceId: c.clientReferenceId, id: `800${i}`, name: 'MockCo' }));
				res.end(JSON.stringify({ requestId: 'mock-csearch', results }));
				return;
			}
			if (req.url.includes('/prospecting')) {
				res.end(
					JSON.stringify({
						requestId: 'mock-prospect',
						results: [
							{ id: '7001', firstName: 'P', canReveal: [{ field: 'emails', credits: 1 }] },
							{ id: '7002', firstName: 'Q', canReveal: [{ field: 'emails', credits: 0 }] },
						],
						pagination: { page: 0, size: 25, total: 2 },
					}),
				);
				return;
			}
			if (req.url.includes('/account/usage')) {
				res.end(JSON.stringify({ credits: { total: 100, used: 0, remaining: 100 } }));
				return;
			}
			res.end(JSON.stringify({ requestId: 'mock', results: [{ id: '1', mock: true }] }));
		});
	},
);

server.listen(443, () => console.log('mock api.lusha.com listening on 443'));

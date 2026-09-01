import {
    IAuthenticateGeneric,
    ICredentialTestRequest,
    ICredentialType,
    INodeProperties,
} from 'n8n-workflow';

export class LushaApi implements ICredentialType {
    name = 'lushaApi';
    displayName = 'Lusha API';
    documentationUrl = 'https://docs.lusha.com/apis/openapi';
    properties: INodeProperties[] = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            required: true,
            placeholder: 'Enter your Lusha API key',
            description: 'Your Lusha API key from the Lusha dashboard',
        },
    ];

    authenticate: IAuthenticateGeneric = {
        type: 'generic',
        properties: {
            headers: {
                'api_key': '={{$credentials.apiKey}}',
            },
        },
    };

    // Validate the key against a non-billable endpoint. GET /v3/account/usage
    // returns credits / rate limits / plan and costs no credits, unlike
    // POST /v3/contacts/search-and-enrich which charges api_search plus a
    // per-revealed-field fee on every credential test.
    test: ICredentialTestRequest = {
        request: {
            baseURL: 'https://api.lusha.com',
            url: '/v3/account/usage',
            method: 'GET',
        },
    };
}

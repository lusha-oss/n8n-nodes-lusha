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
    
    test: ICredentialTestRequest = {
        request: {
            baseURL: 'https://api.lusha.com',
            url: '/v3/contacts/search-and-enrich',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { contacts: [{ email: 'test@lusha.com' }], reveal: [] },
        },
    };
}

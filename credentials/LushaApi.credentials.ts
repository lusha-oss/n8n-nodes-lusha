import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class LushaApi implements ICredentialType {
	name = 'lushaApi';
	displayName = 'Lusha API';
	documentationUrl = 'https://docs.lusha.com/';
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
			description: 'Your Lusha API key. You can find it in your Lusha Dashboard under API settings.',
		},
	];
}

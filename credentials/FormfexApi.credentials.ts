import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const FORMFEX_API_BASE_URL = 'https://api.formfex.com';

export class FormfexApi implements ICredentialType {
  name = 'formfexApi';
  displayName = 'Formfex API';
  documentationUrl = 'https://docs.formfex.com/api';

  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      placeholder: 'fxk_live_...',
      description:
        'Your Formfex API key (format: fxk_live_{keyId}.{secret}). Get it from Account > Integrations > API Keys.',
    },
    // No baseUrl field — hardcoded to prevent SSRF on shared n8n instances
  ];

  authenticate = {
    type: 'generic' as const,
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.apiKey}}',
      },
    },
  };

  test = {
    request: {
      baseURL: FORMFEX_API_BASE_URL,
      url: '/api/v1/public/me',
    },
  };
}

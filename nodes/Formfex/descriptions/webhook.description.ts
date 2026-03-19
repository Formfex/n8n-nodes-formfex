import type { INodeProperties } from 'n8n-workflow';

export const webhookOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['webhook'] } },
    options: [
      { name: 'Create', value: 'create', action: 'Create a webhook', description: 'Create a new webhook endpoint' },
      { name: 'Delete', value: 'delete', action: 'Delete a webhook', description: 'Delete a webhook endpoint' },
      { name: 'Get Many', value: 'getMany', action: 'Get many webhooks', description: 'List all webhook endpoints' },
    ],
    default: 'getMany',
  },
];

export const webhookFields: INodeProperties[] = [
  // ── Create Fields ──
  {
    displayName: 'URL',
    name: 'webhookUrl',
    type: 'string',
    required: true,
    default: '',
    placeholder: 'https://example.com/webhook',
    description: 'The HTTPS URL to receive webhook deliveries',
    displayOptions: { show: { resource: ['webhook'], operation: ['create'] } },
  },
  {
    displayName: 'Events',
    name: 'events',
    type: 'multiOptions',
    required: true,
    default: ['FORM_RESPONSE_CREATED'],
    options: [
      { name: 'Form Created', value: 'FORM_CREATED' },
      { name: 'Form Published', value: 'FORM_PUBLISHED' },
      { name: 'Form Unpublished', value: 'FORM_UNPUBLISHED' },
      { name: 'Form Deleted', value: 'FORM_DELETED' },
      { name: 'Form Expired', value: 'FORM_EXPIRED' },
      { name: 'Form Response Created', value: 'FORM_RESPONSE_CREATED' },
      { name: 'Form Responses Limit Reached', value: 'FORM_RESPONSES_LIMIT_REACHED' },
      { name: 'Analytics Report Completed', value: 'ANALYTICS_REPORT_COMPLETED' },
      { name: 'Subscription Changed', value: 'SUBSCRIPTION_CHANGED' },
      { name: 'Subscription Payment Failed', value: 'SUBSCRIPTION_PAYMENT_FAILED' },
    ],
    description: 'Events to subscribe to',
    displayOptions: { show: { resource: ['webhook'], operation: ['create'] } },
  },
  {
    displayName: 'Description',
    name: 'webhookDescription',
    type: 'string',
    default: '',
    description: 'Optional description for this webhook endpoint',
    displayOptions: { show: { resource: ['webhook'], operation: ['create'] } },
  },

  // ── Delete Fields ──
  {
    displayName: 'Webhook ID',
    name: 'webhookId',
    type: 'string',
    required: true,
    default: '',
    description: 'The UUID of the webhook endpoint to delete',
    displayOptions: { show: { resource: ['webhook'], operation: ['delete'] } },
  },
];

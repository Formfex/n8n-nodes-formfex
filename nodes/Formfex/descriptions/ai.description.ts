import type { INodeProperties } from 'n8n-workflow';

export const aiOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['ai'] } },
    options: [
      { name: 'Analytics Chat', value: 'analyticsChat', action: 'Chat about analytics', description: 'Ask questions about form analytics data' },
      { name: 'Generate Form', value: 'generateForm', action: 'Generate form with AI', description: 'Generate a form from a text prompt using AI' },
      { name: 'Get Job Status', value: 'getJobStatus', action: 'Get AI job status', description: 'Check the status of an AI generation job' },
      { name: 'Smart Analytics', value: 'smartAnalytics', action: 'Dispatch smart analytics', description: 'Generate a smart analytics report' },
    ],
    default: 'generateForm',
  },
];

export const aiFields: INodeProperties[] = [
  // ── Generate Form ──
  {
    displayName: 'Title',
    name: 'title',
    type: 'string',
    required: true,
    default: '',
    placeholder: '30-Day Check-in: John Doe',
    description: 'Title for the generated form',
    displayOptions: { show: { resource: ['ai'], operation: ['generateForm'] } },
  },
  {
    displayName: 'Prompt',
    name: 'prompt',
    type: 'string',
    typeOptions: { rows: 4 },
    required: true,
    default: '',
    placeholder: 'A customer satisfaction survey with rating scales and open-ended feedback',
    description: 'Describe the form you want AI to generate (max 400 characters)',
    displayOptions: { show: { resource: ['ai'], operation: ['generateForm'] } },
  },
  {
    displayName: 'Language',
    name: 'language',
    type: 'options',
    options: [
      { name: 'English', value: 'en' },
      { name: 'Turkish', value: 'tr' },
      { name: 'Spanish', value: 'es' },
      { name: 'Italian', value: 'it' },
      { name: 'German', value: 'de' },
      { name: 'Dutch', value: 'nl' },
    ],
    default: 'en',
    description: 'Language for the generated form',
    displayOptions: { show: { resource: ['ai'], operation: ['generateForm'] } },
  },

  // ── Get Job Status ──
  {
    displayName: 'Job ID',
    name: 'jobId',
    type: 'string',
    required: true,
    default: '',
    description: 'The UUID of the AI job to check',
    displayOptions: { show: { resource: ['ai'], operation: ['getJobStatus'] } },
  },

  // ── Smart Analytics ──
  {
    displayName: 'Form ID',
    name: 'formId',
    type: 'string',
    required: true,
    default: '',
    description: 'The UUID of the form to analyze',
    displayOptions: { show: { resource: ['ai'], operation: ['smartAnalytics'] } },
  },
  {
    displayName: 'Callback URL',
    name: 'callbackUrl',
    type: 'string',
    required: true,
    default: '',
    placeholder: 'https://your-server.com/webhook/formfex-analytics',
    description: 'HTTPS URL where the analytics results will be sent when ready',
    displayOptions: { show: { resource: ['ai'], operation: ['smartAnalytics'] } },
  },

  // ── Analytics Chat ──
  {
    displayName: 'Form ID',
    name: 'formId',
    type: 'string',
    required: true,
    default: '',
    description: 'The UUID of the form to chat about',
    displayOptions: { show: { resource: ['ai'], operation: ['analyticsChat'] } },
  },
  {
    displayName: 'Message',
    name: 'message',
    type: 'string',
    typeOptions: { rows: 2 },
    required: true,
    default: '',
    placeholder: 'What are the most common responses?',
    description: 'Your question about the form analytics data',
    displayOptions: { show: { resource: ['ai'], operation: ['analyticsChat'] } },
  },
  {
    displayName: 'Session ID',
    name: 'sessionId',
    type: 'string',
    default: '',
    description: 'Session ID for multi-turn conversation. Leave empty to start a new session.',
    displayOptions: { show: { resource: ['ai'], operation: ['analyticsChat'] } },
  },
];

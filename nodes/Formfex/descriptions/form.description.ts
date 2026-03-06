import type { INodeProperties } from 'n8n-workflow';

export const formOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['form'] } },
    options: [
      { name: 'Create', value: 'create', action: 'Create a form', description: 'Create a new form' },
      { name: 'Delete', value: 'delete', action: 'Delete a form', description: 'Delete a form' },
      { name: 'Get', value: 'get', action: 'Get a form', description: 'Get a form by ID' },
      { name: 'Get Many', value: 'getMany', action: 'Get many forms', description: 'List forms (paginated)' },
      { name: 'Publish', value: 'publish', action: 'Publish a form', description: 'Publish a form' },
      { name: 'Unpublish', value: 'unpublish', action: 'Unpublish a form', description: 'Unpublish a form' },
      { name: 'Update', value: 'update', action: 'Update a form', description: 'Update a form' },
    ],
    default: 'getMany',
  },
];

export const formFields: INodeProperties[] = [
  // ── Form ID (shared) ──
  {
    displayName: 'Form ID',
    name: 'formId',
    type: 'string',
    required: true,
    default: '',
    description: 'The UUID of the form',
    displayOptions: {
      show: { resource: ['form'], operation: ['get', 'update', 'delete', 'publish', 'unpublish'] },
    },
  },

  // ── Create Fields ──
  {
    displayName: 'Title',
    name: 'title',
    type: 'string',
    required: true,
    default: '',
    description: 'Form title',
    displayOptions: { show: { resource: ['form'], operation: ['create'] } },
  },
  {
    displayName: 'Additional Fields',
    name: 'additionalFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    displayOptions: { show: { resource: ['form'], operation: ['create'] } },
    options: [
      { displayName: 'Description', name: 'description', type: 'string', default: '' },
      { displayName: 'Language', name: 'language', type: 'string', default: 'en', description: 'Form language code (en, tr, es, it, de, nl)' },
      {
        displayName: 'Schema (JSON)',
        name: 'schema',
        type: 'json',
        default: '',
        description: 'Full form schema JSON. Use this to pass an AI-generated schema (e.g. {{ $json.form }}). If empty, a blank form is created.',
      },
    ],
  },

  // ── Update Fields ──
  {
    displayName: 'Update Fields',
    name: 'updateFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    displayOptions: { show: { resource: ['form'], operation: ['update'] } },
    options: [
      { displayName: 'Title', name: 'title', type: 'string', default: '' },
    ],
  },

  // ── Publish Fields ──
  {
    displayName: 'Additional Fields',
    name: 'publishFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    displayOptions: { show: { resource: ['form'], operation: ['publish'] } },
    options: [
      {
        displayName: 'Visibility',
        name: 'visibility',
        type: 'options',
        options: [
          { name: 'Public', value: 'PUBLIC' },
          { name: 'Private', value: 'PRIVATE' },
        ],
        default: 'PUBLIC',
      },
    ],
  },

  // ── Get Many Fields ──
  {
    displayName: 'Return All',
    name: 'returnAll',
    type: 'boolean',
    default: false,
    description: 'Whether to return all results or only up to a given limit',
    displayOptions: { show: { resource: ['form'], operation: ['getMany'] } },
  },
  {
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    default: 50,
    typeOptions: { minValue: 1, maxValue: 100 },
    description: 'Max number of results to return',
    displayOptions: { show: { resource: ['form'], operation: ['getMany'], returnAll: [false] } },
  },
  {
    displayName: 'Filters',
    name: 'filters',
    type: 'collection',
    placeholder: 'Add Filter',
    default: {},
    displayOptions: { show: { resource: ['form'], operation: ['getMany'] } },
    options: [
      { displayName: 'Search', name: 'search', type: 'string', default: '', description: 'Search by form title' },
      { displayName: 'Since', name: 'since', type: 'dateTime', default: '', description: 'Only return forms updated after this time (ISO 8601)' },
    ],
  },
];

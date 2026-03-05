import type { INodeProperties } from 'n8n-workflow';

export const responseOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['response'] } },
    options: [
      { name: 'Get', value: 'get', action: 'Get a response', description: 'Get a single form response' },
      { name: 'Get Many', value: 'getMany', action: 'Get many responses', description: 'List form responses (paginated)' },
    ],
    default: 'getMany',
  },
];

export const responseFields: INodeProperties[] = [
  // ── Form ID (shared) ──
  {
    displayName: 'Form ID',
    name: 'formId',
    type: 'string',
    required: true,
    default: '',
    description: 'The UUID of the form',
    displayOptions: { show: { resource: ['response'] } },
  },

  // ── Response ID (Get) ──
  {
    displayName: 'Response ID',
    name: 'responseId',
    type: 'string',
    required: true,
    default: '',
    description: 'The UUID of the response',
    displayOptions: { show: { resource: ['response'], operation: ['get'] } },
  },

  // ── Get Many Fields ──
  {
    displayName: 'Return All',
    name: 'returnAll',
    type: 'boolean',
    default: false,
    description: 'Whether to return all results or only up to a given limit',
    displayOptions: { show: { resource: ['response'], operation: ['getMany'] } },
  },
  {
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    default: 50,
    typeOptions: { minValue: 1, maxValue: 100 },
    description: 'Max number of results to return',
    displayOptions: { show: { resource: ['response'], operation: ['getMany'], returnAll: [false] } },
  },
  {
    displayName: 'Filters',
    name: 'filters',
    type: 'collection',
    placeholder: 'Add Filter',
    default: {},
    displayOptions: { show: { resource: ['response'], operation: ['getMany'] } },
    options: [
      { displayName: 'Start Date', name: 'startDate', type: 'dateTime', default: '', description: 'Only return responses submitted after this date' },
      { displayName: 'End Date', name: 'endDate', type: 'dateTime', default: '', description: 'Only return responses submitted before this date' },
      { displayName: 'Since', name: 'since', type: 'dateTime', default: '', description: 'Only return responses submitted after this time (for polling)' },
      {
        displayName: 'Order',
        name: 'order',
        type: 'options',
        options: [
          { name: 'Newest First', value: 'newest_first' },
          { name: 'Oldest First', value: 'oldest_first' },
        ],
        default: 'newest_first',
      },
    ],
  },
];

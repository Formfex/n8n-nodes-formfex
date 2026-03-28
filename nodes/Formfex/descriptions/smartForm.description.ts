import type { INodeProperties } from 'n8n-workflow';

export const smartFormOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['smartForm'] } },
    options: [
      {
        name: 'Aggregate Analytics',
        value: 'aggregateAnalytics',
        action: 'Aggregate analytics for a smart form',
        description: 'Trigger aggregate analysis report across sessions',
      },
      {
        name: 'Chat',
        value: 'chat',
        action: 'Chat about smart form data',
        description: 'AI chat about smart form session data',
      },
      {
        name: 'Create',
        value: 'create',
        action: 'Create a smart form',
        description: 'Create a new AI-powered conversational interview form',
      },
      {
        name: 'Delete',
        value: 'delete',
        action: 'Delete a smart form',
        description: 'Delete a smart form',
      },
      {
        name: 'Export',
        value: 'export',
        action: 'Export smart form sessions',
        description: 'Export sessions as CSV or Excel',
      },
      {
        name: 'Get',
        value: 'get',
        action: 'Get a smart form',
        description: 'Get smart form detail with session stats',
      },
      {
        name: 'Get Many',
        value: 'getMany',
        action: 'Get many smart forms',
        description: 'List smart forms (paginated)',
      },
      {
        name: 'Get Session',
        value: 'getSession',
        action: 'Get a smart form session',
        description: 'Get session detail with Q&A and AI analysis',
      },
      {
        name: 'List Sessions',
        value: 'listSessions',
        action: 'List smart form sessions',
        description: 'List interview sessions for a smart form',
      },
      {
        name: 'Publish',
        value: 'publish',
        action: 'Publish a smart form',
        description: 'Publish a smart form to accept interview sessions',
      },
      {
        name: 'Unpublish',
        value: 'unpublish',
        action: 'Unpublish a smart form',
        description: 'Unpublish a smart form (soft or hard mode)',
      },
      {
        name: 'Update',
        value: 'update',
        action: 'Update a smart form',
        description: 'Update smart form configuration',
      },
    ],
    default: 'getMany',
  },
];

export const smartFormFields: INodeProperties[] = [
  // ── Smart Form ID (shared across most operations) ──────────────────────
  {
    displayName: 'Smart Form ID',
    name: 'smartFormId',
    type: 'string',
    required: true,
    default: '',
    description: 'The UUID of the smart form',
    displayOptions: {
      show: {
        resource: ['smartForm'],
        operation: [
          'get',
          'update',
          'delete',
          'publish',
          'unpublish',
          'listSessions',
          'getSession',
          'aggregateAnalytics',
          'chat',
          'export',
        ],
      },
    },
  },

  // ── Session ID (for getSession) ────────────────────────────────────────
  {
    displayName: 'Session ID',
    name: 'sessionId',
    type: 'string',
    required: true,
    default: '',
    description: 'The UUID of the session to retrieve',
    displayOptions: {
      show: { resource: ['smartForm'], operation: ['getSession'] },
    },
  },

  // ── Create Fields ──────────────────────────────────────────────────────
  {
    displayName: 'Purpose',
    name: 'purpose',
    type: 'string',
    typeOptions: { rows: 3 },
    required: true,
    default: '',
    placeholder: 'Collect customer feedback about our new product launch',
    description:
      'The goal of the interview. AI uses this to generate relevant follow-up questions (10-1000 characters).',
    displayOptions: { show: { resource: ['smartForm'], operation: ['create'] } },
  },
  {
    displayName: 'Additional Fields',
    name: 'additionalFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    displayOptions: { show: { resource: ['smartForm'], operation: ['create'] } },
    options: [
      {
        displayName: 'Title',
        name: 'title',
        type: 'string',
        default: '',
        description: 'Optional title. If omitted, AI generates one from the purpose.',
      },
      {
        displayName: 'Description',
        name: 'description',
        type: 'string',
        typeOptions: { rows: 2 },
        default: '',
        description: 'Optional description shown on the welcome screen',
      },
      {
        displayName: 'Target Audience',
        name: 'targetAudience',
        type: 'string',
        default: '',
        description:
          'Optional target audience description. Helps AI tailor questions (e.g. "enterprise SaaS customers").',
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
        description: 'Language for AI-generated questions',
      },
      {
        displayName: 'Max Questions',
        name: 'maxQuestions',
        type: 'number',
        typeOptions: { minValue: 5, maxValue: 15 },
        default: 10,
        description: 'Maximum number of questions per interview session (5-15)',
      },
      {
        displayName: 'Private',
        name: 'isPrivate',
        type: 'boolean',
        default: false,
        description: 'Whether OTP verification is required before the interview starts',
      },
    ],
  },
  {
    displayName: 'Target Schema (JSON String)',
    name: 'targetSchema',
    type: 'string',
    typeOptions: { rows: 4 },
    default: '',
    description: 'JSON Schema defining the desired output format. Pass as JSON string. Must be flat (no nested objects or arrays).',
    displayOptions: { show: { resource: ['smartForm'], operation: ['create'] } },
  },
  {
    displayName: 'Reference JSON (JSON String)',
    name: 'referenceJson',
    type: 'string',
    typeOptions: { rows: 4 },
    default: '',
    description: 'Example JSON object showing the desired output. Pass as JSON string. Types and keys will be inferred automatically.',
    displayOptions: { show: { resource: ['smartForm'], operation: ['create'] } },
  },

  // ── Update Fields ──────────────────────────────────────────────────────
  {
    displayName: 'Update Fields',
    name: 'updateFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    displayOptions: { show: { resource: ['smartForm'], operation: ['update'] } },
    options: [
      {
        displayName: 'Title',
        name: 'title',
        type: 'string',
        default: '',
        description: 'New title for the smart form',
      },
      {
        displayName: 'Purpose',
        name: 'purpose',
        type: 'string',
        typeOptions: { rows: 3 },
        default: '',
        description: 'New interview purpose (10-1000 characters)',
      },
      {
        displayName: 'Description',
        name: 'description',
        type: 'string',
        typeOptions: { rows: 2 },
        default: '',
        description: 'New description for the welcome screen',
      },
      {
        displayName: 'Target Audience',
        name: 'targetAudience',
        type: 'string',
        default: '',
        description: 'New target audience description',
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
        description: 'Language for AI-generated questions',
      },
      {
        displayName: 'Max Questions',
        name: 'maxQuestions',
        type: 'number',
        typeOptions: { minValue: 5, maxValue: 15 },
        default: 10,
        description: 'Maximum number of questions per session (5-15)',
      },
      {
        displayName: 'Private',
        name: 'isPrivate',
        type: 'boolean',
        default: false,
        description: 'Whether OTP verification is required',
      },
      {
        displayName: 'Target Schema',
        name: 'targetSchema',
        type: 'json',
        default: '',
        description: 'JSON Schema defining the desired output format. Responses will be mapped to this structure. Must be flat (no nested objects or arrays).',
      },
      {
        displayName: 'Reference JSON',
        name: 'referenceJson',
        type: 'json',
        default: '',
        description: 'Example JSON object showing the desired output. Types and keys will be inferred automatically.',
      },
    ],
  },

  // ── Unpublish Mode ─────────────────────────────────────────────────────
  {
    displayName: 'Mode',
    name: 'unpublishMode',
    type: 'options',
    required: true,
    options: [
      {
        name: 'Soft',
        value: 'soft',
        description:
          'Stops accepting new sessions but active sessions can still complete',
      },
      {
        name: 'Hard',
        value: 'hard',
        description:
          'Immediately deactivates the URL and expires all active sessions',
      },
    ],
    default: 'soft',
    displayOptions: {
      show: { resource: ['smartForm'], operation: ['unpublish'] },
    },
  },

  // ── Get Many Fields ────────────────────────────────────────────────────
  {
    displayName: 'Return All',
    name: 'returnAll',
    type: 'boolean',
    default: false,
    description: 'Whether to return all results or only up to a given limit',
    displayOptions: {
      show: { resource: ['smartForm'], operation: ['getMany'] },
    },
  },
  {
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    default: 50,
    typeOptions: { minValue: 1, maxValue: 100 },
    description: 'Max number of results to return',
    displayOptions: {
      show: {
        resource: ['smartForm'],
        operation: ['getMany'],
        returnAll: [false],
      },
    },
  },
  {
    displayName: 'Filters',
    name: 'filters',
    type: 'collection',
    placeholder: 'Add Filter',
    default: {},
    displayOptions: {
      show: { resource: ['smartForm'], operation: ['getMany'] },
    },
    options: [
      {
        displayName: 'Search',
        name: 'search',
        type: 'string',
        default: '',
        description: 'Search by title or purpose',
      },
      {
        displayName: 'Status',
        name: 'status',
        type: 'options',
        options: [
          { name: 'Draft', value: 'DRAFT' },
          { name: 'Published', value: 'PUBLISHED' },
          { name: 'Archived', value: 'ARCHIVED' },
        ],
        default: '',
        description: 'Filter by publish status',
      },
    ],
  },

  // ── List Sessions Fields ───────────────────────────────────────────────
  {
    displayName: 'Return All',
    name: 'returnAll',
    type: 'boolean',
    default: false,
    description: 'Whether to return all sessions or only up to a given limit',
    displayOptions: {
      show: { resource: ['smartForm'], operation: ['listSessions'] },
    },
  },
  {
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    default: 50,
    typeOptions: { minValue: 1, maxValue: 100 },
    description: 'Max number of sessions to return',
    displayOptions: {
      show: {
        resource: ['smartForm'],
        operation: ['listSessions'],
        returnAll: [false],
      },
    },
  },
  {
    displayName: 'Filters',
    name: 'sessionFilters',
    type: 'collection',
    placeholder: 'Add Filter',
    default: {},
    displayOptions: {
      show: { resource: ['smartForm'], operation: ['listSessions'] },
    },
    options: [
      {
        displayName: 'Status',
        name: 'status',
        type: 'options',
        options: [
          { name: 'Active', value: 'ACTIVE' },
          { name: 'Completed', value: 'COMPLETED' },
          { name: 'Analyzing', value: 'ANALYZING' },
          { name: 'Expired', value: 'EXPIRED' },
        ],
        default: '',
        description: 'Filter sessions by status',
      },
    ],
  },

  // ── Chat Fields ────────────────────────────────────────────────────────
  {
    displayName: 'Message',
    name: 'message',
    type: 'string',
    typeOptions: { rows: 3 },
    required: true,
    default: '',
    placeholder: 'What are the most common urgent issues reported?',
    description:
      'Your question about the smart form session data (max 500 characters)',
    displayOptions: {
      show: { resource: ['smartForm'], operation: ['chat'] },
    },
  },
  {
    displayName: 'Conversation History',
    name: 'conversationHistory',
    type: 'json',
    default: '[]',
    description:
      'Previous conversation messages as JSON array: [{"role":"user","content":"..."}, {"role":"assistant","content":"..."}]. Pass empty array for new conversation.',
    displayOptions: {
      show: { resource: ['smartForm'], operation: ['chat'] },
    },
  },

  // ── Aggregate Analytics Fields ─────────────────────────────────────────
  {
    displayName: 'Session IDs (Optional)',
    name: 'sessionIds',
    type: 'string',
    default: '',
    description:
      'Comma-separated list of session UUIDs to include. Leave empty to analyze all completed sessions.',
    displayOptions: {
      show: {
        resource: ['smartForm'],
        operation: ['aggregateAnalytics'],
      },
    },
  },

  // ── Export Fields ──────────────────────────────────────────────────────
  {
    displayName: 'Format',
    name: 'exportFormat',
    type: 'options',
    options: [
      { name: 'CSV', value: 'csv' },
      { name: 'Excel (XLSX)', value: 'xlsx' },
    ],
    default: 'csv',
    description: 'Export file format',
    displayOptions: {
      show: { resource: ['smartForm'], operation: ['export'] },
    },
  },
];

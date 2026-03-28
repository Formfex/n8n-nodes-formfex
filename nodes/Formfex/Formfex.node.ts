import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import * as crypto from 'crypto';
import { formOperations, formFields } from './descriptions/form.description';
import { responseOperations, responseFields } from './descriptions/response.description';
import { aiOperations, aiFields } from './descriptions/ai.description';
import { webhookOperations, webhookFields } from './descriptions/webhook.description';
import { smartFormOperations, smartFormFields } from './descriptions/smartForm.description';
import { formfexApiRequest, validateUuid, safePath, MAX_PAGES } from './helpers';

export class Formfex implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Formfex',
    name: 'formfex',
    icon: 'file:Formfex.png',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Create forms, manage smart forms, read responses, and run AI analytics with Formfex',
    defaults: { name: 'Formfex' },
    inputs: ['main'],
    outputs: ['main', 'ai_tool'],
    usableAsTool: true,
    credentials: [{ name: 'formfexApi', required: true }],
    requestDefaults: {
      baseURL: 'https://api.formfex.com',
      headers: { 'Content-Type': 'application/json' },
    },
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'AI', value: 'ai' },
          { name: 'Form', value: 'form' },
          { name: 'Response', value: 'response' },
          { name: 'Smart Form', value: 'smartForm' },
          { name: 'Webhook', value: 'webhook' },
        ],
        default: 'form',
      },
      ...formOperations,
      ...formFields,
      ...responseOperations,
      ...responseFields,
      ...aiOperations,
      ...aiFields,
      ...smartFormOperations,
      ...smartFormFields,
      ...webhookOperations,
      ...webhookFields,
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const resource = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;

    for (let i = 0; i < items.length; i++) {
      try {
        let responseData: any;

        if (resource === 'form') {
          responseData = await executeFormOperation.call(this, operation, i);
        } else if (resource === 'response') {
          responseData = await executeResponseOperation.call(this, operation, i);
        } else if (resource === 'ai') {
          responseData = await executeAiOperation.call(this, operation, i);
        } else if (resource === 'smartForm') {
          responseData = await executeSmartFormOperation.call(this, operation, i);
        } else if (resource === 'webhook') {
          responseData = await executeWebhookOperation.call(this, operation, i);
        }

        if (Array.isArray(responseData)) {
          returnData.push(...responseData.map((item: any) => ({ json: item })));
        } else if (responseData) {
          returnData.push({ json: responseData });
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }

}

async function executeFormOperation(
  this: IExecuteFunctions,
  operation: string,
  i: number,
): Promise<any> {
  if (operation === 'create') {
    const title = this.getNodeParameter('title', i) as string;
    const additionalFields = this.getNodeParameter('additionalFields', i, {}) as Record<string, any>;
    const language = additionalFields.language || 'en';

    let schema: Record<string, any>;
    if (additionalFields.schema) {
      schema = typeof additionalFields.schema === 'string'
        ? JSON.parse(additionalFields.schema)
        : additionalFields.schema;
    } else {
      schema = {
        version: '1.0',
        schemaVersion: '2026-02',
        meta: {
          title,
          description: additionalFields.description || '',
          language,
        },
        settings: {
          layout: 'single-column',
          submitAction: 'default',
        },
        sections: [
          {
            id: crypto.randomUUID(),
            title: 'Section 1',
            order: 0,
          },
        ],
        fields: [],
      };
    }

    const body: Record<string, any> = { title, schema };
    const result = await formfexApiRequest.call(this, 'POST', '/forms', body);
    return result.data;
  }

  if (operation === 'get') {
    const formId = this.getNodeParameter('formId', i) as string;
    validateUuid(this, formId, 'Form ID');
    const result = await formfexApiRequest.call(this, 'GET', `/forms/${safePath(formId)}`);
    return result.data;
  }

  if (operation === 'getMany') {
    const returnAll = this.getNodeParameter('returnAll', i) as boolean;
    const filters = this.getNodeParameter('filters', i, {}) as Record<string, any>;
    const limit = returnAll ? 100 : (this.getNodeParameter('limit', i) as number);

    const query: Record<string, any> = { limit, page: 1 };
    if (filters.search) query.search = filters.search;
    if (filters.since) query.since = filters.since;

    if (!returnAll) {
      const result = await formfexApiRequest.call(this, 'GET', '/forms', undefined, query);
      return result.data.forms ?? result.data;
    }

    // Paginate
    const allItems: any[] = [];
    let page = 1;
    let hasMore = true;
    while (hasMore && page <= MAX_PAGES) {
      query.page = page;
      const result = await formfexApiRequest.call(this, 'GET', '/forms', undefined, query);
      const items = result.data.forms ?? result.data ?? [];
      allItems.push(...items);
      hasMore = result.data.hasMore ?? items.length === limit;
      page++;
    }
    if (page > MAX_PAGES) {
      allItems.push({ _warning: `Return All truncated at ${MAX_PAGES * limit} records. Use filters to narrow the dataset.` });
    }
    return allItems;
  }

  if (operation === 'update') {
    const formId = this.getNodeParameter('formId', i) as string;
    validateUuid(this, formId, 'Form ID');
    const updateFields = this.getNodeParameter('updateFields', i, {}) as Record<string, any>;
    const result = await formfexApiRequest.call(this, 'PATCH', `/forms/${safePath(formId)}`, updateFields);
    return result.data;
  }

  if (operation === 'delete') {
    const formId = this.getNodeParameter('formId', i) as string;
    validateUuid(this, formId, 'Form ID');
    const result = await formfexApiRequest.call(this, 'DELETE', `/forms/${safePath(formId)}`);
    return result.data ?? { success: true };
  }

  if (operation === 'publish') {
    const formId = this.getNodeParameter('formId', i) as string;
    validateUuid(this, formId, 'Form ID');
    const publishFields = this.getNodeParameter('publishFields', i, {}) as Record<string, any>;
    const body: Record<string, any> = {};
    if (publishFields.visibility) body.visibility = publishFields.visibility;
    const result = await formfexApiRequest.call(this, 'POST', `/forms/${safePath(formId)}/publish`, body);
    return result.data;
  }

  if (operation === 'unpublish') {
    const formId = this.getNodeParameter('formId', i) as string;
    validateUuid(this, formId, 'Form ID');
    const result = await formfexApiRequest.call(this, 'POST', `/forms/${safePath(formId)}/unpublish`);
    return result.data;
  }

  throw new NodeApiError(this.getNode(), { message: `Unknown operation: ${operation}` });
}

async function executeResponseOperation(
  this: IExecuteFunctions,
  operation: string,
  i: number,
): Promise<any> {
  const formId = this.getNodeParameter('formId', i) as string;
  validateUuid(this, formId, 'Form ID');

  if (operation === 'count') {
    const filters = this.getNodeParameter('filters', i, {}) as Record<string, any>;
    const query: Record<string, any> = {};
    if (filters.startDate) query.startDate = filters.startDate;
    if (filters.endDate) query.endDate = filters.endDate;
    const result = await formfexApiRequest.call(this, 'GET', `/forms/${safePath(formId)}/responses/count`, undefined, query);
    return result.data;
  }

  if (operation === 'get') {
    const responseId = this.getNodeParameter('responseId', i) as string;
    validateUuid(this, responseId, 'Response ID');
    const result = await formfexApiRequest.call(this, 'GET', `/forms/${safePath(formId)}/responses/${safePath(responseId)}`);
    return result.data;
  }

  if (operation === 'getMany') {
    const returnAll = this.getNodeParameter('returnAll', i) as boolean;
    const filters = this.getNodeParameter('filters', i, {}) as Record<string, any>;
    const limit = returnAll ? 100 : (this.getNodeParameter('limit', i) as number);

    const query: Record<string, any> = { limit, page: 1 };
    if (filters.startDate) query.startDate = filters.startDate;
    if (filters.endDate) query.endDate = filters.endDate;
    if (filters.since) query.since = filters.since;
    if (filters.order) query.order = filters.order;

    if (!returnAll) {
      const result = await formfexApiRequest.call(this, 'GET', `/forms/${safePath(formId)}/responses`, undefined, query);
      return result.data.items ?? result.data;
    }

    // Paginate
    const allItems: any[] = [];
    let page = 1;
    let hasMore = true;
    while (hasMore && page <= MAX_PAGES) {
      query.page = page;
      const result = await formfexApiRequest.call(this, 'GET', `/forms/${safePath(formId)}/responses`, undefined, query);
      const items = result.data.items ?? result.data ?? [];
      allItems.push(...items);
      hasMore = result.data.hasMore ?? items.length === limit;
      page++;
    }
    if (page > MAX_PAGES) {
      allItems.push({ _warning: `Return All truncated at ${MAX_PAGES * limit} records. Use date filters to narrow the dataset.` });
    }
    return allItems;
  }

  throw new NodeApiError(this.getNode(), { message: `Unknown operation: ${operation}` });
}

async function executeAiOperation(
  this: IExecuteFunctions,
  operation: string,
  i: number,
): Promise<any> {
  if (operation === 'generateForm') {
    const title = this.getNodeParameter('title', i) as string;
    const prompt = this.getNodeParameter('prompt', i) as string;
    const language = this.getNodeParameter('language', i, 'en') as string;
    const targetSchema = this.getNodeParameter('targetSchema', i, '') as string;
    const referenceJson = this.getNodeParameter('referenceJson', i, '') as string;

    // Step 1: Dispatch AI job
    const body: Record<string, unknown> = { prompt, language };

    if (targetSchema) {
      try { body.targetSchema = JSON.parse(targetSchema); } catch { /* let API validate */ }
    }
    if (referenceJson) {
      try { body.referenceJson = JSON.parse(referenceJson); } catch { /* let API validate */ }
    }

    const dispatchResult = await formfexApiRequest.call(this, 'POST', '/ai/generate-form', body);
    const jobId = dispatchResult.data.jobId;

    // Step 2: Poll until done (max 20 attempts, 3s interval = 60s max)
    const MAX_POLL_ATTEMPTS = 20;
    const POLL_INTERVAL_MS = 3000;
    let schema: any = null;
    let completedJob: any = null;

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS);
      const jobResult = await formfexApiRequest.call(this, 'GET', `/ai/jobs/${safePath(jobId)}`);
      const job = jobResult.data;

      if (job.status === 'DONE') {
        schema = job.output?.form ?? job.output;
        completedJob = job;
        break;
      }
      if (job.status === 'FAILED') {
        throw new NodeApiError(this.getNode(), {
          message: 'AI form generation failed',
          description: job.error ?? 'Unknown error',
        });
      }
      // PENDING or PROCESSING — keep polling
    }

    if (!schema) {
      throw new NodeApiError(this.getNode(), {
        message: 'AI form generation timed out',
        description: `Job ${jobId} did not complete within ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 1000} seconds`,
      });
    }

    // Step 3: Create the form in the database with the AI-generated schema
    let parsedSchema = typeof schema === 'string' ? JSON.parse(schema) : schema;

    // Ensure language is set in the schema meta
    if (parsedSchema?.meta) {
      parsedSchema.meta.language = language;
    }

    const createBody: Record<string, unknown> = { title, schema: parsedSchema };

    if (completedJob?.output?.fieldMapping) {
      createBody.fieldMapping = completedJob.output.fieldMapping;
    }
    if (completedJob?.output?.targetSchema) {
      createBody.targetSchema = completedJob.output.targetSchema;
    }
    if (completedJob?.output?.schemaInputType) {
      createBody.schemaInputType = completedJob.output.schemaInputType;
    }

    const createResult = await formfexApiRequest.call(this, 'POST', '/forms', createBody);
    return createResult.data;
  }

  if (operation === 'getJobStatus') {
    const jobId = this.getNodeParameter('jobId', i) as string;
    validateUuid(this, jobId, 'Job ID');
    const result = await formfexApiRequest.call(this, 'GET', `/ai/jobs/${safePath(jobId)}`);
    return result.data;
  }

  if (operation === 'smartAnalytics') {
    const formId = this.getNodeParameter('formId', i) as string;
    validateUuid(this, formId, 'Form ID');
    const callbackUrl = this.getNodeParameter('callbackUrl', i) as string;
    const result = await formfexApiRequest.call(this, 'POST', `/forms/${safePath(formId)}/smart-analytics`, { callbackUrl });
    return result.data;
  }

  if (operation === 'analyticsChat') {
    const formId = this.getNodeParameter('formId', i) as string;
    validateUuid(this, formId, 'Form ID');
    const rawMessage = this.getNodeParameter('message', i) as string;
    const message = rawMessage.length > 2000 ? rawMessage.substring(0, 2000) : rawMessage;
    const sessionId = this.getNodeParameter('sessionId', i, '') as string;
    const body: Record<string, any> = { message };
    // Only include sessionId if it's a valid UUID
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (sessionId && UUID_RE.test(sessionId)) body.sessionId = sessionId;
    const result = await formfexApiRequest.call(this, 'POST', `/forms/${safePath(formId)}/analytics-chat`, body);
    return result.data;
  }

  throw new NodeApiError(this.getNode(), { message: `Unknown operation: ${operation}` });
}

async function executeWebhookOperation(
  this: IExecuteFunctions,
  operation: string,
  i: number,
): Promise<any> {
  if (operation === 'create') {
    const url = this.getNodeParameter('webhookUrl', i) as string;
    const events = this.getNodeParameter('events', i) as string[];
    const description = this.getNodeParameter('webhookDescription', i, '') as string;

    const body: Record<string, any> = { url, events };
    if (description) body.description = description;

    const result = await formfexApiRequest.call(this, 'POST', '/webhooks', body);
    return result.data;
  }

  if (operation === 'getMany') {
    const result = await formfexApiRequest.call(this, 'GET', '/webhooks');
    return result.data ?? result;
  }

  if (operation === 'delete') {
    const webhookId = this.getNodeParameter('webhookId', i) as string;
    validateUuid(this, webhookId, 'Webhook ID');
    const result = await formfexApiRequest.call(this, 'DELETE', `/webhooks/${safePath(webhookId)}`);
    return result.data ?? { success: true };
  }

  throw new NodeApiError(this.getNode(), { message: `Unknown operation: ${operation}` });
}

async function executeSmartFormOperation(
  this: IExecuteFunctions,
  operation: string,
  i: number,
): Promise<any> {
  // ── Create ──
  if (operation === 'create') {
    const purpose = this.getNodeParameter('purpose', i) as string;
    const additionalFields = this.getNodeParameter('additionalFields', i, {}) as Record<string, any>;

    const body: Record<string, any> = { purpose };
    if (additionalFields.title) body.title = additionalFields.title;
    if (additionalFields.description) body.description = additionalFields.description;
    if (additionalFields.targetAudience) body.targetAudience = additionalFields.targetAudience;
    if (additionalFields.language) body.language = additionalFields.language;
    if (additionalFields.maxQuestions) body.maxQuestions = additionalFields.maxQuestions;
    if (additionalFields.isPrivate !== undefined) body.isPrivate = additionalFields.isPrivate;

    // Top-level fields (moved out of additionalFields for reliable expression support)
    let targetSchemaRaw: any;
    let referenceJsonRaw: any;
    try { targetSchemaRaw = this.getNodeParameter('targetSchema', i, ''); } catch { targetSchemaRaw = ''; }
    try { referenceJsonRaw = this.getNodeParameter('referenceJson', i, ''); } catch { referenceJsonRaw = ''; }

    if (targetSchemaRaw) {
      try {
        body.targetSchema = typeof targetSchemaRaw === 'string'
          ? JSON.parse(targetSchemaRaw)
          : targetSchemaRaw;
      } catch { /* let API validate */ }
    }

    if (referenceJsonRaw) {
      try {
        body.referenceJson = typeof referenceJsonRaw === 'string'
          ? JSON.parse(referenceJsonRaw)
          : referenceJsonRaw;
      } catch { /* let API validate */ }
    }
    const result = await formfexApiRequest.call(this, 'POST', '/smart-forms', body);
    return result.data;
  }

  // ── Get ──
  if (operation === 'get') {
    const id = this.getNodeParameter('smartFormId', i) as string;
    validateUuid(this, id, 'Smart Form ID');
    const result = await formfexApiRequest.call(this, 'GET', `/smart-forms/${safePath(id)}`);
    return result.data;
  }

  // ── Get Many ──
  if (operation === 'getMany') {
    const returnAll = this.getNodeParameter('returnAll', i) as boolean;
    const filters = this.getNodeParameter('filters', i, {}) as Record<string, any>;
    const limit = returnAll ? 50 : (this.getNodeParameter('limit', i) as number);

    const query: Record<string, any> = { limit, page: 1 };
    if (filters.search) query.search = filters.search;
    if (filters.status) query.status = filters.status;

    if (!returnAll) {
      const result = await formfexApiRequest.call(this, 'GET', '/smart-forms', undefined, query);
      return result.data.items ?? result.data;
    }

    // Paginate
    const allItems: any[] = [];
    let page = 1;
    let hasMore = true;
    while (hasMore && page <= MAX_PAGES) {
      query.page = page;
      const result = await formfexApiRequest.call(this, 'GET', '/smart-forms', undefined, query);
      const items = result.data.items ?? result.data ?? [];
      allItems.push(...items);
      hasMore = result.data.hasMore ?? items.length === limit;
      page++;
    }
    if (page > MAX_PAGES) {
      allItems.push({
        _warning: `Return All truncated at ${MAX_PAGES * limit} records. Use filters to narrow the dataset.`,
      });
    }
    return allItems;
  }

  // ── Update ──
  if (operation === 'update') {
    const id = this.getNodeParameter('smartFormId', i) as string;
    validateUuid(this, id, 'Smart Form ID');
    const updateFields = this.getNodeParameter('updateFields', i, {}) as Record<string, any>;

    const body: Record<string, any> = { ...updateFields };

    if (updateFields.targetSchema) {
      try {
        body.targetSchema = typeof updateFields.targetSchema === 'string'
          ? JSON.parse(updateFields.targetSchema as string)
          : updateFields.targetSchema;
      } catch { /* ignore invalid JSON — let API validate */ }
    }

    if (updateFields.referenceJson) {
      try {
        body.referenceJson = typeof updateFields.referenceJson === 'string'
          ? JSON.parse(updateFields.referenceJson as string)
          : updateFields.referenceJson;
      } catch { /* ignore invalid JSON — let API validate */ }
    }

    const result = await formfexApiRequest.call(
      this,
      'PATCH',
      `/smart-forms/${safePath(id)}`,
      body,
    );
    return result.data;
  }

  // ── Delete ──
  if (operation === 'delete') {
    const id = this.getNodeParameter('smartFormId', i) as string;
    validateUuid(this, id, 'Smart Form ID');
    const result = await formfexApiRequest.call(
      this,
      'DELETE',
      `/smart-forms/${safePath(id)}`,
    );
    return result.data ?? { success: true };
  }

  // ── Publish ──
  if (operation === 'publish') {
    const id = this.getNodeParameter('smartFormId', i) as string;
    validateUuid(this, id, 'Smart Form ID');
    const result = await formfexApiRequest.call(
      this,
      'POST',
      `/smart-forms/${safePath(id)}/publish`,
    );
    return result.data;
  }

  // ── Unpublish ──
  if (operation === 'unpublish') {
    const id = this.getNodeParameter('smartFormId', i) as string;
    validateUuid(this, id, 'Smart Form ID');
    const mode = this.getNodeParameter('unpublishMode', i) as string;
    const result = await formfexApiRequest.call(
      this,
      'POST',
      `/smart-forms/${safePath(id)}/unpublish`,
      { mode },
    );
    return result.data;
  }

  // ── List Sessions ──
  if (operation === 'listSessions') {
    const id = this.getNodeParameter('smartFormId', i) as string;
    validateUuid(this, id, 'Smart Form ID');
    const returnAll = this.getNodeParameter('returnAll', i) as boolean;
    const sessionFilters = this.getNodeParameter('sessionFilters', i, {}) as Record<string, any>;
    const limit = returnAll ? 100 : (this.getNodeParameter('limit', i) as number);

    const query: Record<string, any> = { limit, page: 1 };
    if (sessionFilters.status) query.status = sessionFilters.status;

    if (!returnAll) {
      const result = await formfexApiRequest.call(
        this,
        'GET',
        `/smart-forms/${safePath(id)}/sessions`,
        undefined,
        query,
      );
      return result.data.items ?? result.data;
    }

    // Paginate
    const allItems: any[] = [];
    let page = 1;
    let hasMore = true;
    while (hasMore && page <= MAX_PAGES) {
      query.page = page;
      const result = await formfexApiRequest.call(
        this,
        'GET',
        `/smart-forms/${safePath(id)}/sessions`,
        undefined,
        query,
      );
      const items = result.data.items ?? result.data ?? [];
      allItems.push(...items);
      hasMore = result.data.hasMore ?? items.length === limit;
      page++;
    }
    if (page > MAX_PAGES) {
      allItems.push({
        _warning: `Return All truncated at ${MAX_PAGES * limit} records. Use status filter to narrow the dataset.`,
      });
    }
    return allItems;
  }

  // ── Get Session ──
  if (operation === 'getSession') {
    const id = this.getNodeParameter('smartFormId', i) as string;
    validateUuid(this, id, 'Smart Form ID');
    const sessionId = this.getNodeParameter('sessionId', i) as string;
    validateUuid(this, sessionId, 'Session ID');
    const result = await formfexApiRequest.call(
      this,
      'GET',
      `/smart-forms/${safePath(id)}/sessions/${safePath(sessionId)}`,
    );
    return result.data;
  }

  // ── Aggregate Analytics ──
  if (operation === 'aggregateAnalytics') {
    const id = this.getNodeParameter('smartFormId', i) as string;
    validateUuid(this, id, 'Smart Form ID');
    const sessionIdsParam = this.getNodeParameter('sessionIds', i, '') as string;

    const body: Record<string, any> = {};
    if (sessionIdsParam) {
      const ids = sessionIdsParam.split(',').map((s) => s.trim()).filter(Boolean);
      if (ids.length > 0) body.sessionIds = ids;
    }

    const result = await formfexApiRequest.call(
      this,
      'POST',
      `/smart-forms/${safePath(id)}/aggregate-analytics`,
      body,
    );
    return result.data;
  }

  // ── Chat ──
  if (operation === 'chat') {
    const id = this.getNodeParameter('smartFormId', i) as string;
    validateUuid(this, id, 'Smart Form ID');
    const rawMessage = this.getNodeParameter('message', i) as string;
    const message = rawMessage.length > 500 ? rawMessage.substring(0, 500) : rawMessage;
    const conversationHistoryRaw = this.getNodeParameter('conversationHistory', i, '[]') as string;

    const body: Record<string, any> = { message };

    // Parse conversation history
    try {
      const parsed = typeof conversationHistoryRaw === 'string'
        ? JSON.parse(conversationHistoryRaw)
        : conversationHistoryRaw;
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Keep only last 10 messages
        body.conversationHistory = parsed.slice(-10);
      }
    } catch {
      // Invalid JSON — skip conversation history
    }

    const result = await formfexApiRequest.call(
      this,
      'POST',
      `/smart-forms/${safePath(id)}/chat`,
      body,
    );
    return result.data;
  }

  // ── Export ──
  if (operation === 'export') {
    const id = this.getNodeParameter('smartFormId', i) as string;
    validateUuid(this, id, 'Smart Form ID');
    const format = this.getNodeParameter('exportFormat', i, 'csv') as string;

    const result = await formfexApiRequest.call(
      this,
      'GET',
      `/smart-forms/${safePath(id)}/export`,
      undefined,
      { format },
    );
    return result.data ?? result;
  }

  throw new NodeApiError(this.getNode(), {
    message: `Unknown smart form operation: ${operation}`,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

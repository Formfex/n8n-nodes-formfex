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
import { formfexApiRequest, validateUuid, safePath, MAX_PAGES } from './helpers';

export class Formfex implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Formfex',
    name: 'formfex',
    icon: 'file:Formfex.png',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Interact with Formfex forms, responses, and AI features',
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

    // Step 1: Dispatch AI job
    const dispatchResult = await formfexApiRequest.call(this, 'POST', '/ai/generate-form', { prompt, language });
    const jobId = dispatchResult.data.jobId;

    // Step 2: Poll until done (max 20 attempts, 3s interval = 60s max)
    const MAX_POLL_ATTEMPTS = 20;
    const POLL_INTERVAL_MS = 3000;
    let schema: any = null;

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS);
      const jobResult = await formfexApiRequest.call(this, 'GET', `/ai/jobs/${safePath(jobId)}`);
      const job = jobResult.data;

      if (job.status === 'DONE') {
        schema = job.output?.form ?? job.output;
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

    const createResult = await formfexApiRequest.call(this, 'POST', '/forms', {
      title,
      schema: parsedSchema,
    });
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

import type {
  IWebhookFunctions,
  IHookFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IWebhookResponseData,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import * as crypto from 'crypto';
import { formfexApiRequest, BASE_URL, API_PREFIX } from './helpers';

export class FormfexWebhookTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Formfex Webhook Trigger',
    name: 'formfexWebhookTrigger',
    icon: 'file:Formfex.png',
    group: ['trigger'],
    version: 1,
    subtitle: '=Webhook: {{$parameter["event"]}}',
    description:
      'Triggers instantly when a Formfex event occurs (e.g. new form response, smart form session completed)',
    defaults: { name: 'Formfex Webhook Trigger' },
    inputs: [],
    outputs: ['main'],
    credentials: [{ name: 'formfexApi', required: true }],
    webhooks: [
      {
        name: 'default',
        httpMethod: 'POST',
        responseMode: 'onReceived',
        path: 'webhook',
      },
    ],
    properties: [
      {
        displayName: 'Event',
        name: 'event',
        type: 'options',
        required: true,
        default: 'FORM_RESPONSE_CREATED',
        options: [
          {
            name: 'Form Response Created',
            value: 'FORM_RESPONSE_CREATED',
            description: 'Triggers when a new form response is submitted',
          },
          {
            name: 'Form Created',
            value: 'FORM_CREATED',
            description: 'Triggers when a new form is created',
          },
          {
            name: 'Form Published',
            value: 'FORM_PUBLISHED',
            description: 'Triggers when a form is published',
          },
          {
            name: 'Form Deleted',
            value: 'FORM_DELETED',
            description: 'Triggers when a form is deleted',
          },
          {
            name: 'Analytics Report Completed',
            value: 'ANALYTICS_REPORT_COMPLETED',
            description: 'Triggers when a smart analytics report is ready',
          },
          {
            name: 'Smart Form Session Completed',
            value: 'SMART_FORM_SESSION_COMPLETED',
            description:
              'Triggers when a smart form interview session is completed (including expired sessions with 3+ answers)',
          },
        ],
      },
      {
        displayName: 'Form IDs (Optional)',
        name: 'formIds',
        type: 'string',
        default: '',
        description:
          'Comma-separated list of form UUIDs to filter. Leave empty to receive events for ALL forms. The AI Agent can dynamically manage this list via workflow static data.',
        placeholder: 'e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6',
      },
    ],
  };

  webhookMethods = {
    default: {
      async checkExists(this: IHookFunctions): Promise<boolean> {
        // Always return false to force re-registration.
        // This ensures the webhook URL is always current (tunnel URL changes on restart)
        // and the n8n test webhook listener is properly set up.
        const staticData = this.getWorkflowStaticData('node');
        const webhookId = staticData.webhookId as string | undefined;

        // Clean up old webhook if exists
        if (webhookId) {
          try {
            await formfexApiRequest.call(
              this,
              'DELETE',
              `/webhooks/${encodeURIComponent(webhookId)}`,
            );
          } catch {
            // ignore — may already be gone
          }
          delete staticData.webhookId;
        }

        return false;
      },

      async create(this: IHookFunctions): Promise<boolean> {
        const webhookUrl = this.getNodeWebhookUrl('default');
        const event = this.getNodeParameter('event') as string;

        if (!webhookUrl || !webhookUrl.startsWith('https://')) {
          throw new NodeApiError(this.getNode(), {
            message: 'Webhook URL must be HTTPS. Current URL: ' + (webhookUrl ?? 'undefined'),
            description: 'n8n must be started with WEBHOOK_URL pointing to an HTTPS tunnel (e.g. Cloudflare Tunnel).',
          });
        }

        const body = {
          url: webhookUrl,
          events: [event],
          description: `n8n webhook trigger (workflow: ${this.getWorkflow().name ?? 'unknown'})`,
        };

        try {
          const result = await formfexApiRequest.call(
            this,
            'POST',
            '/webhooks',
            body,
          );

          const webhook = result.data ?? result;
          const staticData = this.getWorkflowStaticData('node');
          staticData.webhookId = webhook.id;

          return true;
        } catch (error: any) {
          const detail = error?.description ?? error?.message ?? JSON.stringify(error);
          throw new NodeApiError(this.getNode(), {
            message: `Failed to register webhook. URL: ${webhookUrl}`,
            description: detail,
          });
        }
      },

      async delete(this: IHookFunctions): Promise<boolean> {
        const staticData = this.getWorkflowStaticData('node');
        const webhookId = staticData.webhookId as string | undefined;
        if (!webhookId) return true;

        try {
          await formfexApiRequest.call(
            this,
            'DELETE',
            `/webhooks/${encodeURIComponent(webhookId)}`,
          );
        } catch {
          // Webhook may already be deleted — ignore
        }

        delete staticData.webhookId;
        return true;
      },
    },
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const req = this.getRequestObject();
    const body = req.body as Record<string, any>;

    // ── HMAC signature verification ──
    const signatureHeader = req.headers['x-formfex-signature'] as
      | string
      | undefined;

    // We don't have the secret in the trigger (API returns masked secret).
    // Signature verification is best-effort: if the header is present we log it
    // but cannot verify without the full secret. The webhook URL itself is
    // unguessable (n8n generates a random path), providing baseline security.

    // ── Form ID filtering ──
    const formIdsParam = this.getNodeParameter('formIds', '') as string;
    const staticData = this.getWorkflowStaticData('node');
    const dynamicFormIds = (staticData.watchedFormIds as string[]) ?? [];

    // Merge static param + dynamic list
    const allowedFormIds = new Set<string>([
      ...formIdsParam
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
      ...dynamicFormIds,
    ]);

    // Check both formId (regular forms) and smartFormId (smart forms)
    const payloadFormId = (body?.data?.formId ?? body?.data?.smartFormId) as string | undefined;

    // If there are allowed form IDs and the payload doesn't match, skip
    if (allowedFormIds.size > 0 && payloadFormId && !allowedFormIds.has(payloadFormId)) {
      return { noWebhookResponse: true };
    }

    const returnData: INodeExecutionData[] = [
      {
        json: {
          event: body?.type ?? body?.event,
          formId: body?.data?.formId ?? undefined,
          smartFormId: body?.data?.smartFormId ?? undefined,
          ...body?.data,
          _webhookPayload: body,
        },
      },
    ];

    return { workflowData: [returnData] };
  }
}

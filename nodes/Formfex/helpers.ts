import type { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions, IPollFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export const BASE_URL = 'https://api.formfex.com';
export const API_PREFIX = '/api/v1/public';
export const MAX_PAGES = 50;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validates a string is a UUID. Throws NodeApiError if not. */
export function validateUuid(
  context: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions | IPollFunctions,
  value: string,
  fieldName: string,
): void {
  if (!UUID_REGEX.test(value)) {
    throw new NodeApiError(context.getNode(), {
      message: `Invalid ${fieldName}: must be a valid UUID`,
      description: `Received: "${value}"`,
    });
  }
}

/** Safe URL path encoding for user-supplied IDs. */
export function safePath(id: string): string {
  return encodeURIComponent(id);
}

/** Error map for friendly user-facing messages. */
const ERROR_MAP: Record<number, string> = {
  401: 'Authentication failed. Check your Formfex API key.',
  402: 'Insufficient credits. Upgrade your Formfex plan.',
  403: 'Your API key does not have the required scope for this operation.',
  404: 'The requested resource was not found.',
  429: 'Rate limit exceeded. Please slow down your requests.',
};

/** Make an authenticated API request to Formfex. */
export async function formfexApiRequest(
  this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions | IPollFunctions,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  endpoint: string,
  body?: object,
  query?: Record<string, string | number | boolean>,
): Promise<any> {
  const options: any = {
    method,
    url: `${BASE_URL}${API_PREFIX}${endpoint}`,
    json: true,
    qs: query ?? {},
  };

  if (body && Object.keys(body).length > 0) {
    options.body = body;
  }

  try {
    return await this.helpers.requestWithAuthentication.call(this, 'formfexApi', options);
  } catch (error: any) {
    const statusCode = error?.statusCode ?? error?.response?.statusCode;
    const friendlyMessage = statusCode ? ERROR_MAP[statusCode] : undefined;

    throw new NodeApiError(this.getNode(), error, {
      message: friendlyMessage ?? `Formfex API error (${statusCode ?? 'unknown'})`,
      description: sanitizeError(error?.message ?? ''),
    });
  }
}

/** Strip internal details from error messages before showing to user. */
export function sanitizeError(message: string): string {
  // Remove internal paths, stack traces, and sensitive details
  return message
    .replace(/\/[a-zA-Z0-9/_.-]+\.(ts|js):\d+/g, '[internal]')
    .replace(/at\s+[\w.]+\s+\(.*\)/g, '')
    .substring(0, 500);
}

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

/** Validates a URL is absolute and uses HTTPS. Throws NodeApiError if not. */
export function validateHttpsUrl(
  context: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions | IPollFunctions,
  value: string,
  fieldName: string,
): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new NodeApiError(context.getNode(), {
      message: `Invalid ${fieldName}`,
      description: `"${fieldName}" must be a valid absolute URL.`,
    });
  }
  if (parsed.protocol !== 'https:') {
    throw new NodeApiError(context.getNode(), {
      message: `${fieldName} must use HTTPS`,
      description: `Received protocol: "${parsed.protocol}". Only HTTPS URLs are allowed.`,
    });
  }
}

/** Safe URL path encoding for user-supplied IDs. */
export function safePath(id: string): string {
  return encodeURIComponent(id);
}

/** Error map for friendly user-facing messages. */
const ERROR_MAP: Record<number, string> = {
  400: 'Bad request — see details below.',
  401: 'Authentication failed. Check your Formfex API key.',
  402: 'Insufficient credits. Upgrade your Formfex plan.',
  403: 'Your API key does not have the required scope for this operation.',
  404: 'The requested resource was not found.',
  429: 'Rate limit exceeded. Please slow down your requests.',
};

/** Extract detailed error info from Formfex API response body. */
function extractErrorDetails(error: any): string {
  // n8n wraps HTTP errors in different structures depending on the helper used.
  // Try multiple paths to find the response body.
  const candidates = [
    error?.response?.body,
    error?.cause?.response?.body,
    error?.body,
    error?.description,
    error?.error,
  ];

  for (const raw of candidates) {
    if (!raw) continue;

    let parsed = raw;
    if (typeof raw === 'string') {
      try { parsed = JSON.parse(raw); } catch { continue; }
    }

    if (typeof parsed !== 'object' || parsed === null) continue;

    // 1. Use details array (class-validator produces these)
    if (Array.isArray(parsed.details) && parsed.details.length > 0) {
      return `Validation errors: ${parsed.details.join('; ')}`;
    }

    // 2. Use message if it contains useful info (not just "Bad Request")
    if (parsed.message && parsed.message !== 'Bad Request' && parsed.message !== 'Bad request') {
      const msg = typeof parsed.message === 'string' ? parsed.message : JSON.stringify(parsed.message);
      if (msg.length > 15) return msg; // Skip very short generic messages
    }
  }

  // 3. Fallback: try to extract from the error message itself
  const errMsg = error?.message ?? '';
  if (errMsg.includes('must be') || errMsg.includes('should be') || errMsg.includes('is not') || errMsg.includes('expected')) {
    return errMsg;
  }

  return '';
}

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
    const errorDetails = extractErrorDetails(error);

    const description = errorDetails
      || sanitizeError(error?.message ?? '');

    throw new NodeApiError(this.getNode(), error, {
      message: friendlyMessage ?? `Formfex API error (${statusCode ?? 'unknown'})`,
      description,
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

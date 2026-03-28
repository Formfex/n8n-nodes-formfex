# n8n-nodes-formfex

[n8n](https://n8n.io/) community node for [Formfex](https://formfex.com) — AI-powered form infrastructure and data collection platform.

Create forms, collect responses, trigger automations, and generate forms with AI directly from your n8n workflows.

![License](https://img.shields.io/npm/l/n8n-nodes-formfex)
![n8n](https://img.shields.io/badge/n8n-community--node-orange)

## Installation

### Community Nodes (Recommended)

1. Go to **Settings > Community Nodes** in your n8n instance
2. Click **Install a community node**
3. Enter `n8n-nodes-formfex`
4. Click **Install**

### Manual Installation

```bash
cd ~/.n8n/nodes
npm install n8n-nodes-formfex
```

Restart n8n after installation.

## Credentials

You need a Formfex API key to use this node.

1. Log in to [Formfex](https://formfex.com)
2. Go to **Account > Integrations > API Keys**
3. Click **Create** and select the permissions you need
4. Copy the key (format: `fxk_live_<keyId>.<secret>`)
5. In n8n, add a new **Formfex API** credential and paste the key

> API keys require a **Starter plan** or higher.

## Nodes

### Formfex

Regular node with three resources:

#### Form Operations

| Operation | Description |
|-----------|-------------|
| **Create** | Create a new form |
| **Get** | Get a form by ID |
| **Get Many** | List forms (with pagination and search) |
| **Update** | Update a form |
| **Delete** | Delete a form |
| **Publish** | Publish a form |
| **Unpublish** | Unpublish a form |

#### Response Operations

| Operation | Description |
|-----------|-------------|
| **Get** | Get a single response by ID |
| **Get Many** | List responses (with date filters and pagination) |

#### AI Operations

| Operation | Description |
|-----------|-------------|
| **Generate Form** | Generate a form from a text prompt using AI (polls until complete) |
| **Get Job Status** | Check the status of an AI generation job |
| **Smart Analytics** | Dispatch an async smart analytics report (results sent to callback URL) |
| **Analytics Chat** | Ask natural language questions about form analytics data |

### Formfex Trigger

Polling trigger that watches for new form responses.

| Parameter | Description |
|-----------|-------------|
| **Form ID** | The UUID of the form to watch |

The trigger polls periodically and returns any new responses since the last check. Configure the polling interval in your n8n workflow settings.

## AI Agent Tool Mode

The Formfex node has `usableAsTool: true`, which means it can be used as a tool inside **n8n AI Agent** nodes. This allows AI agents to autonomously create forms, fetch responses, and generate analytics.

## Supported Languages

Formfex supports 6 languages for form generation and content:

- English (`en`)
- Turkish (`tr`)
- Spanish (`es`)
- Italian (`it`)
- German (`de`)
- Dutch (`nl`)

## API Scopes

When creating an API key, select the scopes your workflow needs:

| Scope | Description |
|-------|-------------|
| `FORMS_READ` | List and view forms |
| `FORMS_WRITE` | Create, edit, delete forms |
| `RESPONSES_READ` | List and view form submissions |
| `WEBHOOKS_READ` | List and view webhooks |
| `WEBHOOKS_WRITE` | Create, edit, delete webhooks |
| `AI_GENERATE` | Generate forms with AI |
| `ANALYTICS_READ` | Access smart analytics and analytics chat |

## Workflow Examples

This package includes 8 ready-to-use workflow templates in the `examples/` folder. After installing the node, find them at:

```
node_modules/n8n-nodes-formfex/examples/
```

Import any workflow into n8n:

```bash
n8n import:workflow --input=node_modules/n8n-nodes-formfex/examples/<filename>.json
```

### Full Orchestrators (Create + Monitor)

These workflows generate a form with AI, publish it, email the link, then monitor responses with analytics and Slack notifications.

| Workflow | File | Use Case |
|----------|------|----------|
| **Event Follow-up** | `event-followup-orchestrator.json` | Post-event attendee feedback with AI analytics and planning insights |
| **Churn Prevention** | `churn-prevention-orchestrator.json` | SaaS exit survey for churning users with product team alerts |
| **Post-Delivery Review** | `post-delivery-orchestrator.json` | E-commerce product review collection after delivery confirmation |
| **Patient Intake Interview** | `patient-intake-orchestrator.json` | Healthcare intake via AI conversational Smart Form with triage routing |
| **Hotel Checkout Satisfaction** | `hotel-checkout-orchestrator.json` | Personalized guest checkout feedback via Smart Form interviews |
| **Community Event Manager** | `community-event-orchestrator.json` | Event registration form with AI-powered candidate screening |

### AI Agent Orchestrators

These workflows use n8n's AI Agent node with Formfex tools, allowing an LLM to autonomously create and personalize forms based on input data.

| Workflow | File | Use Case |
|----------|------|----------|
| **Hotel Guest Satisfaction** | `hotel-checkout-ai-agent.json` | AI agent creates personalized post-stay surveys per guest profile |
| **HR Onboarding 30-Day** | `hr-onboarding-ai-agent.json` | AI agent generates 30-day check-in surveys tailored to each employee |

### Setup

Each example workflow requires you to configure your own credentials after import:

1. **Formfex API** — Create an API key at [Formfex > Account > Integrations](https://formfex.com)
2. **SMTP** — Your email provider (e.g., Resend, SendGrid, Amazon SES)
3. **Slack** *(optional)* — Slack Bot token for notifications
4. **Google Gemini** *(AI Agent workflows only)* — Google AI API key

Replace the `YOUR_*` placeholder values in each workflow with your actual credential IDs.

## Resources

- [Formfex Website](https://formfex.com)
- [Formfex API Documentation](https://docs.formfex.com/api)
- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE)

import type {
  IPollFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { formfexApiRequest, validateUuid, safePath } from './helpers';

export class FormfexTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Formfex Trigger',
    name: 'formfexTrigger',
    icon: 'file:Formfex.svg',
    group: ['trigger'],
    version: 1,
    subtitle: '=New Response on Form',
    description: 'Triggers when a new form response is submitted',
    defaults: { name: 'Formfex Trigger' },
    inputs: [],
    outputs: ['main'],
    credentials: [{ name: 'formfexApi', required: true }],
    polling: true,
    properties: [
      {
        displayName: 'Form ID',
        name: 'formId',
        type: 'string',
        required: true,
        default: '',
        description: 'The UUID of the form to watch for new responses',
      },
    ],
  };

  async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
    const formId = this.getNodeParameter('formId') as string;
    validateUuid(this, formId, 'Form ID');

    const staticData = this.getWorkflowStaticData('node');
    const lastTimeChecked = (staticData.lastTimeChecked as string) ?? new Date().toISOString();

    const query: Record<string, any> = {
      since: lastTimeChecked,
      order: 'newest_first',
      limit: 100,
      page: 1,
    };

    const allItems: any[] = [];
    let hasMore = true;
    let page = 1;
    const MAX_POLL_PAGES = 10; // Safety cap for polling

    while (hasMore && page <= MAX_POLL_PAGES) {
      query.page = page;
      const result = await formfexApiRequest.call(
        this,
        'GET',
        `/forms/${safePath(formId)}/responses`,
        undefined,
        query,
      );
      const items = result.data?.items ?? [];
      allItems.push(...items);
      hasMore = result.data?.hasMore ?? items.length === 100;
      page++;
    }

    // Update the checkpoint
    staticData.lastTimeChecked = new Date().toISOString();

    if (allItems.length === 0) {
      return null;
    }

    return [allItems.map((item: any) => ({ json: item }))];
  }
}

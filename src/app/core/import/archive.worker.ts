/// <reference lib="webworker" />

import { parseInstagramFile } from './archive-parser';

addEventListener('message', async (event: MessageEvent<{ file: File }>) => {
  try {
    const result = await parseInstagramFile(event.data.file);
    postMessage({ success: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Importazione non riuscita.';
    postMessage({ success: false, error: message });
  }
});

import { Injectable } from '@angular/core';
import { ParsedArchive } from '../../shared/models/snapshot.model';

@Injectable({ providedIn: 'root' })
export class ArchiveParserService {
  parse(file: File, timeoutMs = 20_000): Promise<ParsedArchive> {
    if (typeof Worker === 'undefined') {
      return Promise.reject(
        new Error('Web Worker non disponibile: importazione interrotta per sicurezza.'),
      );
    }

    const worker = new Worker(new URL('./archive.worker', import.meta.url), { type: 'module' });
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error('Importazione interrotta per timeout.'));
      }, timeoutMs);

      worker.addEventListener(
        'message',
        (event: MessageEvent<{ success: boolean; result?: ParsedArchive; error?: string }>) => {
          clearTimeout(timeout);
          worker.terminate();
          if (event.data.success && event.data.result) {
            resolve(event.data.result);
          } else {
            reject(new Error(event.data.error ?? 'Importazione non riuscita.'));
          }
        },
      );
      worker.addEventListener('error', () => {
        clearTimeout(timeout);
        worker.terminate();
        reject(new Error('Il parser non ha completato l’importazione.'));
      });
      worker.postMessage({ file });
    });
  }
}

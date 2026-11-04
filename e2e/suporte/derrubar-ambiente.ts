import { compose } from './ambiente';

export default async function derrubarAmbiente(): Promise<void> {
  if (process.env['E2E_SEM_DOCKER'] || process.env['E2E_MANTER_AMBIENTE']) {
    return;
  }
  compose('down --volumes');
}

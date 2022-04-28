import {targetEnv} from 'utils/config';

const message = 'Configure engines';

const revision = '20211011114043_configure_engines';
const downRevision = '20210928090443_add_unsplash';

const storage = browser.storage.local;

async function upgrade() {
  const changes = {};

  if (targetEnv === 'safari') {
    const {engines, disabledEngines} = await storage.get([
      'engines',
      'disabledEngines'
    ]);

    const restoreEngines = ['iqdb', 'jpDesign'];

    changes.engines = engines.concat(restoreEngines);
    changes.disabledEngines = disabledEngines.concat(restoreEngines);
  }

  changes.storageVersion = revision;
  return storage.set(changes);
}

export {message, revision, upgrade};

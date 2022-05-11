import {targetEnv} from 'utils/config';

const message = 'Configure engines';

const revision = '20211011114043_configure_engines';

async function upgrade() {
  const changes = {};

  if (targetEnv === 'safari') {
    const {engines, disabledEngines} = await browser.storage.local.get([
      'engines',
      'disabledEngines'
    ]);

    const restoreEngines = ['iqdb', 'jpDesign'];

    changes.engines = engines.concat(restoreEngines);
    changes.disabledEngines = disabledEngines.concat(restoreEngines);
  }

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};

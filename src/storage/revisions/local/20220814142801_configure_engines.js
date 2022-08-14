import {isMobile} from 'utils/common';
import {targetEnv} from 'utils/config';

const message = 'Configure engines';

const revision = '20220814142801_configure_engines';

async function upgrade() {
  const changes = {};

  if (targetEnv === 'safari' && (await isMobile())) {
    const {engines, disabledEngines} = await browser.storage.local.get([
      'engines',
      'disabledEngines'
    ]);

    const newEngines = ['googleLens'];

    changes.engines = engines.concat(newEngines);
    changes.disabledEngines = disabledEngines.concat(newEngines);
  }

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};

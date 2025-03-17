import {targetEnv} from 'utils/config';

const message = 'Add back Google Images';

const revision = '20250317134215_add_back_google_images';

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await browser.storage.local.get([
    'engines',
    'disabledEngines'
  ]);

  if (!['chrome', 'opera'].includes(targetEnv)) {
    engines.push('googleImages');
    disabledEngines.push('googleImages');

    changes.engines = engines;
    changes.disabledEngines = disabledEngines;
  }

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};

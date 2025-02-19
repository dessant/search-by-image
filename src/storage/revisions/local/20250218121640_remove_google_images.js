const message = 'Remove Google Images';

const revision = '20250218121640_remove_google_images';

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await browser.storage.local.get([
    'engines',
    'disabledEngines'
  ]);

  engines.splice(engines.indexOf('google'), 1);
  changes.engines = engines;

  if (disabledEngines.includes('google')) {
    disabledEngines.splice(disabledEngines.indexOf('google'), 1);
  } else if (disabledEngines.includes('googleLens')) {
    disabledEngines.splice(disabledEngines.indexOf('googleLens'), 1);
  }
  changes.disabledEngines = disabledEngines;

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};

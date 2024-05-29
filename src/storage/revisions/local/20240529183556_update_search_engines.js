const message = 'Update search engines';

const revision = '20240529183556_update_search_engines';

async function upgrade(context) {
  const changes = {};

  const {engines, disabledEngines} = await browser.storage.local.get([
    'engines',
    'disabledEngines'
  ]);

  // Move Google Lens to the top
  engines.splice(0, 0, engines.splice(engines.indexOf('googleLens'), 1)[0]);

  // Enable Google Lens if Google Images is enabled
  if (
    disabledEngines.includes('googleLens') &&
    !disabledEngines.includes('google')
  ) {
    disabledEngines.splice(disabledEngines.indexOf('googleLens'), 1);
  }

  // Disable Google Images for new installations
  if (context.install) {
    disabledEngines.push('google');
  }

  changes.engines = engines;
  changes.disabledEngines = disabledEngines;

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};

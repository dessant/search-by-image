const message = 'Add WhatAnime';

const revision = 'BJXdcUXOG';

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await browser.storage.local.get([
    'engines',
    'disabledEngines'
  ]);

  changes.engines = engines.concat('whatanime');
  changes.disabledEngines = disabledEngines.concat('whatanime');

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};

import browser from 'webextension-polyfill';

const message = 'Add WhatAnime';

const revision = 'BJXdcUXOG';
const downRevision = 'S1ebtZ3Uzz';

const storage = browser.storage.local;

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await storage.get([
    'engines',
    'disabledEngines'
  ]);

  changes.engines = engines.concat('whatanime');
  changes.disabledEngines = disabledEngines.concat('whatanime');

  changes.storageVersion = revision;
  return storage.set(changes);
}

async function downgrade() {
  const changes = {};
  const {engines, disabledEngines} = await storage.get([
    'engines',
    'disabledEngines'
  ]);

  changes.engines = engines.filter(function(item) {
    return item !== 'whatanime';
  });
  changes.disabledEngines = disabledEngines.filter(function(item) {
    return item !== 'whatanime';
  });

  changes.storageVersion = downRevision;
  return storage.set(changes);
}

module.exports = {
  message,
  revision,
  upgrade,
  downgrade
};

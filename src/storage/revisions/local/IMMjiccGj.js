import browser from 'webextension-polyfill';

const message = 'Hide unavailable engines';

const revision = 'IMMjiccGj';
const downRevision = 'ggrr9C9pgV';

const storage = browser.storage.local;

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await storage.get([
    'engines',
    'disabledEngines'
  ]);
  const missingEngines = [
    'wayfair',
    'birchlane',
    'allmodern',
    'jossandmain',
    'perigold'
  ];

  changes.engines = engines.filter(function (item) {
    return !missingEngines.includes(item);
  });
  changes.disabledEngines = disabledEngines.filter(function (item) {
    return !missingEngines.includes(item);
  });

  changes.storageVersion = revision;
  return storage.set(changes);
}

async function downgrade() {
  const changes = {};

  changes.storageVersion = downRevision;
  return storage.set(changes);
}

export {message, revision, upgrade, downgrade};

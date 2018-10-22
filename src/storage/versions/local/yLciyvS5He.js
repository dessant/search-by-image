import browser from 'webextension-polyfill';

const message = 'Add Jingdong, Taobao and Alibaba China';

const revision = 'yLciyvS5He';
const downRevision = 'SkwaU8NlX';

const storage = browser.storage.local;

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await storage.get([
    'engines',
    'disabledEngines'
  ]);
  const newEngines = ['jingdong', 'taobao', 'alibabaChina'];

  changes.engines = engines.concat(newEngines);
  changes.disabledEngines = disabledEngines.concat(newEngines);

  changes.storageVersion = revision;
  return storage.set(changes);
}

async function downgrade() {
  const changes = {};
  const {engines, disabledEngines} = await storage.get([
    'engines',
    'disabledEngines'
  ]);
  const newEngines = ['jingdong', 'taobao', 'alibabaChina'];

  changes.engines = engines.filter(function(item) {
    return !newEngines.includes(item);
  });
  changes.disabledEngines = disabledEngines.filter(function(item) {
    return !newEngines.includes(item);
  });

  changes.storageVersion = downRevision;
  return storage.set(changes);
}

export {message, revision, upgrade, downgrade};

const message = 'Remove search engines';

const revision = '20230531103023_remove_search_engines';

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await browser.storage.local.get([
    'engines',
    'disabledEngines'
  ]);

  const removeEngines = ['jingdong', 'mailru'];

  changes.engines = engines.filter(function (item) {
    return !removeEngines.includes(item);
  });
  changes.disabledEngines = disabledEngines.filter(function (item) {
    return !removeEngines.includes(item);
  });

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};

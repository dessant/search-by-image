import browser from 'webextension-polyfill';

import {targetEnv} from 'utils/config';

const message = 'Configure engines for Samsung Internet';

const revision = 'd8IK4KCtVm';
const downRevision = 'd8CIdomCW';

const storage = browser.storage.sync;

async function upgrade() {
  const changes = {};

  if (targetEnv === 'samsung') {
    const {engines, disabledEngines} = await storage.get([
      'engines',
      'disabledEngines'
    ]);

    const enabledEngines = ['shutterstock', 'dreamstime'];

    const hiddenEngines = [
      'mailru',
      'jingdong',
      'taobao',
      'alibabaChina',
      'auTrademark'
    ];

    changes.engines = engines.filter(function (item) {
      return !hiddenEngines.includes(item);
    });
    changes.disabledEngines = disabledEngines.filter(function (item) {
      return !enabledEngines.includes(item) && !hiddenEngines.includes(item);
    });
  }

  changes.storageVersion = revision;
  return storage.set(changes);
}

async function downgrade() {
  const changes = {};

  if (targetEnv === 'samsung') {
    const {engines, disabledEngines} = await storage.get([
      'engines',
      'disabledEngines'
    ]);

    const enabledEngines = ['shutterstock', 'dreamstime'];

    const hiddenEngines = [
      'mailru',
      'jingdong',
      'taobao',
      'alibabaChina',
      'auTrademark'
    ];

    changes.engines = engines.concat(hiddenEngines);
    changes.disabledEngines = disabledEngines
      .concat(enabledEngines)
      .concat(hiddenEngines);
  }

  changes.storageVersion = downRevision;
  return storage.set(changes);
}

export {message, revision, upgrade, downgrade};

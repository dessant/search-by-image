import {targetEnv} from 'utils/config';

const message = 'Configure engines for Samsung Internet';

const revision = 'd8IK4KCtVm';

async function upgrade() {
  const changes = {};

  if (targetEnv === 'samsung') {
    const {engines, disabledEngines} = await browser.storage.local.get([
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
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};

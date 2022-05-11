import {isAndroid} from 'utils/common';
import {targetEnv} from 'utils/config';

const message = 'Configure search engines';

const revision = 'TshBYj8anA';

async function upgrade() {
  const changes = {};

  const {installTime} = await browser.storage.local.get('installTime');

  let {engines, disabledEngines} = await browser.storage.local.get([
    'engines',
    'disabledEngines'
  ]);

  const hiddenEngines = [];

  if (targetEnv === 'samsung') {
    engines.splice(engines.indexOf('auDesign'), 0, 'auTrademark');
    disabledEngines.push('auTrademark', 'dreamstime');
  } else if (targetEnv === 'safari') {
    hiddenEngines.push('iqdb', 'jpDesign');
  }

  if ((await isAndroid()) || targetEnv === 'safari') {
    hiddenEngines.push('jingdong', 'taobao', 'alibabaChina');
  }

  if (hiddenEngines.length) {
    engines = engines.filter(function (item) {
      return !hiddenEngines.includes(item);
    });
    disabledEngines = disabledEngines.filter(function (item) {
      return !hiddenEngines.includes(item);
    });
  }

  if (Date.now() - installTime < 60000) {
    if (targetEnv === 'samsung') {
      disabledEngines.push('dreamstime');
    }

    const enabledEngines = ['sogou', 'shutterstock', 'alamy'];

    disabledEngines = disabledEngines.filter(function (item) {
      return !enabledEngines.includes(item);
    });
  }

  engines.splice(
    engines.indexOf('baidu') + 1,
    0,
    engines.splice(engines.indexOf('sogou'), 1)[0]
  );

  changes.engines = engines;
  changes.disabledEngines = disabledEngines;

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};

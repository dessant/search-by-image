import _ from 'lodash';

import storage from 'storage/storage';

async function getEnabledEngines(options) {
  if (typeof options === 'undefined') {
    options = await storage.get(['engines', 'disabledEngines'], 'sync');
  }
  return _.difference(options.engines, options.disabledEngines);
}

module.exports = {
  getEnabledEngines
};

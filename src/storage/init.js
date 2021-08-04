import {migrate} from 'wesa';

import {getSupportedArea} from './storage';

async function initStorage(area = 'local') {
  area = await getSupportedArea(area);
  const context = require.context('storage', true, /\.(?:js|json)$/i);
  return migrate(context, {area});
}

export {initStorage};

import {createApp} from 'vue';

import {configApp} from 'utils/app';
import App from './App';

async function init() {
  const app = createApp(App);
  await configApp(app);

  app.mount('body');
}

init();

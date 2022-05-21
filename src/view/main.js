import {createApp} from 'vue';

import {configApp, loadFonts} from 'utils/app';
import App from './App';

async function init() {
  await loadFonts(['400 14px Roboto', '500 14px Roboto']);

  const app = createApp(App);
  await configApp(app);

  app.mount('body');
}

init();

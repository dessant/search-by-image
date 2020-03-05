import Vue from 'vue';

import {configFenix} from 'utils/app';
import App from './App';

async function init() {
  try {
    await document.fonts.load('400 14px Roboto');
    await document.fonts.load('500 14px Roboto');
  } catch (err) {}

  Vue.prototype.$isFenix = await configFenix();

  new Vue({
    el: '#app',
    render: h => h(App)
  });
}

init();

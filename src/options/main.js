import Vue from 'vue';

import {configTheme} from 'utils/app';
import {isAndroid} from 'utils/common';
import App from './App';

async function init() {
  await configTheme();

  try {
    await document.fonts.load('400 14px Roboto');
    await document.fonts.load('500 14px Roboto');
  } catch (err) {}

  Vue.prototype.$isAndroid = await isAndroid();

  new Vue({
    el: '#app',
    render: h => h(App)
  });
}

init();

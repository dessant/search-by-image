import Vue from 'vue';

import {configTheme} from 'utils/app';
import App from './App';

async function init() {
  await configTheme();

  new Vue({
    el: '#app',
    render: h => h(App)
  });
}

init();

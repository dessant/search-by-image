import Vue from 'vue';

import {configFenix} from 'utils/app';
import App from './App';

async function init() {
  await configFenix();

  new Vue({
    el: '#app',
    render: h => h(App)
  });
}

init();

import Vue from 'vue';

import {configUI} from 'utils/app';
import App from './App';

async function init() {
  await configUI(Vue);

  new Vue({
    el: '#app',
    render: h => h(App)
  });
}

init();

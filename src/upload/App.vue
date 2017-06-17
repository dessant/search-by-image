<template>
<div id="app">
  <div v-show="showSpinner && !error" class="sk-rotating-plane"></div>
  <div v-show="error">
    <div class="error-icon">:/</div>
    <div class="error-text">{{ error }}</div>
  </div>

</div>
</template>

<script>
import storage from 'storage/storage';
import {onError, getText, dataUriToBlob} from 'utils/common';
import {optionKeys} from 'utils/data';

export default {
  data: function() {
    return {
      error: '',
      showSpinner: false,
      engine: ''
    };
  },

  methods: {
    processDataUri: async function(message) {
      if (message.hasOwnProperty('error')) {
        this.error = getText(`error:${message.error}`);
        return;
      }
      if (this.engine === 'google') {
        var data = new FormData();
        data.append('encoded_image', dataUriToBlob(message.dataUri));
        var rsp = await fetch('https://www.google.com/searchbyimage/upload', {
          referrer: 'https://www.google.com/',
          mode: 'cors',
          method: 'POST',
          body: data
        });
        var tabUrl = rsp.url;

        var options = await storage.get(['localGoogle'], 'sync');
        if (!options.localGoogle) {
          tabUrl = `${tabUrl}&gws_rd=cr`;
        }

        window.location.replace(tabUrl);
      }
    }
  },

  created: async function() {
    var query = new URL(window.location.href).searchParams;

    this.engine = query.get('engine');
    if (!this.engine) {
      this.error = getText('error:InvalidPageUrl');
      return;
    }

    document.title = getText(`engineName:${this.engine}:full`);

    if (this.engine !== 'google') {
      this.error = getText(
        'error:InvalidImageUrl:dataUri',
        getText(`engineName:${this.engine}:full`)
      );
      return;
    }

    var dataKey = query.get('dataKey');
    if (!dataKey) {
      this.error = getText('error:InvalidPageUrl');
      return;
    }

    this.showSpinner = true;

    var gettingDataUri = browser.runtime.sendMessage({dataKey: dataKey});
    gettingDataUri.then(this.processDataUri, onError);
  }
};
</script>

<style scoped lang="scss">
#app {}
</style>

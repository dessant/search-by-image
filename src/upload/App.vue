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
    onMessage: async function(request, sender, sendResponse) {
      if (request.id === 'dataUriResponse') {
        if (request.hasOwnProperty('error')) {
          this.error = getText(`error_${request.error}`);
        } else {
          await this.processDataUri(request.dataUri);
        }
      }
    },

    processDataUri: async function(dataUri) {
      if (this.engine === 'google') {
        const data = new FormData();
        data.append('encoded_image', dataUriToBlob(dataUri));
        const rsp = await fetch('https://www.google.com/searchbyimage/upload', {
          referrer: '',
          mode: 'cors',
          method: 'POST',
          body: data
        });
        let tabUrl = rsp.url;

        const {localGoogle} = await storage.get('localGoogle', 'sync');
        if (!localGoogle) {
          tabUrl = tabUrl.replace(
            /(.*google\.)[a-zA-Z0-9_\-.]+(\/.*)/,
            '$1com$2&gws_rd=cr'
          );
        }

        window.location.replace(tabUrl);
      }

      if (this.engine === 'tineye') {
        const data = new FormData();
        data.append('image', dataUriToBlob(dataUri));
        const rsp = await fetch('https://www.tineye.com/search', {
          referrer: '',
          mode: 'cors',
          method: 'POST',
          body: data
        });
        const tabUrl = rsp.url;

        window.location.replace(tabUrl);
      }
    }
  },

  created: async function() {
    browser.runtime.onMessage.addListener(this.onMessage);

    const query = new URL(window.location.href).searchParams;

    this.engine = query.get('engine');
    if (!this.engine) {
      this.error = getText('error_invalidPageUrl');
      return;
    }

    document.title = getText(`engineName_${this.engine}_full`);

    const supportedEngines = ['google', 'tineye'];
    if (supportedEngines.indexOf(this.engine) === -1) {
      this.error = getText(
        'error_invalidImageUrl_dataUri',
        getText(`engineName_${this.engine}_full`)
      );
      return;
    }

    const dataKey = query.get('dataKey');
    if (!dataKey) {
      this.error = getText('error_invalidPageUrl');
      return;
    }

    this.showSpinner = true;

    await browser.runtime.sendMessage({
      id: 'dataUriRequest',
      dataKey: dataKey
    });
  }
};
</script>

<style lang="scss">
$spinkit-size: 36px;
$spinkit-spinner-color: #e74c3c;

@import 'spinkit/scss/spinners/1-rotating-plane';
@import '@material/theme/mdc-theme';
@import '@material/typography/mdc-typography';

html,
body {
  height: 80%;
}

#app {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-icon {
  font-size: 96px;
  color: #e74c3c;
}

.error-text {
  @include mdc-typography('subheading2');
  @include mdc-theme-prop('color', 'text-primary-on-light');
  max-width: 520px;
  margin-top: 36px;
}
</style>

<template>
<div id="app" v-show="dataLoaded">
  <div v-show="showSpinner && !error" class="sk-rotating-plane"></div>
  <div v-show="error">
    <div class="error-icon">:/</div>
    <div class="error-text">{{ error }}</div>
  </div>

</div>
</template>

<script>
import browser from 'webextension-polyfill';

import storage from 'storage/storage';
import {onError, getText} from 'utils/common';
import {optionKeys} from 'utils/data';

export default {
  data: function() {
    return {
      dataLoaded: false,

      error: '',
      showSpinner: false,
      engine: ''
    };
  },

  methods: {
    onMessage: async function(request, sender, sendResponse) {
      if (request.id === 'imageDataResponse') {
        if (request.hasOwnProperty('error')) {
          this.error = getText(`error_${request.error}`);
        } else {
          const params = {imgData: request.imgData};
          let getImage = true;
          if (request.imgData.isBlob) {
            const size = request.imgData.size;
            if (this.engine === 'google' && size > 20 * 1024 * 1024) {
              this.error = getText('error_invalidImageSize', [
                getText('engineName_google'),
                getText('unit_mb', '20')
              ]);
              getImage = false;
            }
            if (this.engine === 'tineye' && size > 10 * 1024 * 1024) {
              this.error = getText('error_invalidImageSize', [
                getText('engineName_tineye'),
                getText('unit_mb', '10')
              ]);
              getImage = false;
            }

            if (this.engine === 'karmaDecay' && size > 9 * 1024 * 1024) {
              this.error = getText('error_invalidImageSize', [
                getText('engineName_karmaDecay'),
                getText('unit_mb', '9')
              ]);
              getImage = false;
            }

            if (getImage) {
              const rsp = await fetch(request.imgData.objectUrl);
              params.blob = await rsp.blob();
            }

            await browser.runtime.sendMessage({
              id: 'imageUploadReceipt',
              receiptKey: request.imgData.receiptKey
            });
          }

          if (getImage) {
            await this.processImgData(params);
          }
        }
      }
    },

    processImgData: async function({blob, imgData}) {
      if (this.engine === 'google') {
        const data = new FormData();
        data.append('encoded_image', blob, imgData.filename);
        const rsp = await fetch('https://www.google.com/searchbyimage/upload', {
          referrer: '',
          mode: 'cors',
          method: 'POST',
          body: data
        });

        if (rsp.status === 413) {
          this.error = getText('error_invalidImageSize', [
            getText('engineName_google'),
            getText('unit_mb', '20')
          ]);
          return;
        }

        let tabUrl = rsp.url;
        const {localGoogle} = await storage.get('localGoogle', 'sync');
        if (!localGoogle) {
          tabUrl = tabUrl.replace(
            /(.*google\.)[a-zA-Z0-9_\-.]+(\/.*)/,
            '$1com$2&gl=US'
          );
        }

        window.location.replace(tabUrl);
      }

      if (this.engine === 'tineye') {
        const data = new FormData();
        data.append('image', blob, imgData.filename);
        const rsp = await fetch('https://www.tineye.com/search', {
          referrer: '',
          mode: 'cors',
          method: 'POST',
          body: data
        });
        const tabUrl = rsp.url;

        window.location.replace(tabUrl);
      }

      if (this.engine === 'karmaDecay') {
        const data = new FormData();
        data.append('image', blob, imgData.filename);
        const rsp = await fetch('http://karmadecay.com/index/', {
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
      this.dataLoaded = true;
      return;
    }

    document.title = getText('pageTitle', [
      getText(`optionTitle_${this.engine}`),
      getText('extensionName')
    ]);

    const supportedEngines = ['google', 'tineye', 'karmaDecay'];
    if (!supportedEngines.includes(this.engine)) {
      this.error = getText(
        'error_invalidImageUrl_dataUri',
        getText(`optionTitle_${this.engine}`)
      );
      this.dataLoaded = true;
      return;
    }

    const dataKey = query.get('dataKey');
    if (!dataKey) {
      this.error = getText('error_invalidPageUrl');
      this.dataLoaded = true;
      return;
    }

    this.showSpinner = true;
    this.dataLoaded = true;

    await browser.runtime.sendMessage({
      id: 'imageDataRequest',
      dataKey: dataKey
    });
  }
};
</script>

<style lang="scss">
$spinkit-size: 36px;
$spinkit-spinner-color: #e74c3c;
$mdc-theme-primary: #1abc9c;

@import 'spinkit/scss/spinners/1-rotating-plane';
@import '@material/theme/mixins';
@import '@material/typography/mixins';

html,
body {
  height: 100%;
}

body {
  margin: 0;
  @include mdc-typography-base;
  font-size: 100%;
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

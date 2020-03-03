<template>
  <div id="app" v-show="dataLoaded">
    <div v-if="showSpinner && !error" class="sk-rotating-plane"></div>
    <div v-if="error">
      <div class="error-icon">:/</div>
      <div class="error-text">{{ error }}</div>
    </div>
  </div>
</template>

<script>
import browser from 'webextension-polyfill';

import storage from 'storage/storage';
import {onError, getText} from 'utils/common';
import {engines} from 'utils/data';

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
        if (request.error) {
          if (request.error === 'sessionExpired') {
            this.error = getText(
              'error_sessionExpired',
              getText(`engineName_${this.engine}`)
            );
          }
        } else {
          const params = {imgData: request.imgData};
          if (params.imgData.isUpload[this.engine]) {
            const size = params.imgData.size;
            if (this.engine === 'google' && size > 20 * 1024 * 1024) {
              this.error = getText('error_invalidImageSize', [
                getText('engineName_google'),
                getText('unit_mb', '20')
              ]);
            }

            if (this.engine === 'karmaDecay' && size > 9 * 1024 * 1024) {
              this.error = getText('error_invalidImageSize', [
                getText('engineName_karmaDecay'),
                getText('unit_mb', '9')
              ]);
            }

            if (
              ['saucenao', 'shutterstock'].includes(this.engine) &&
              size > 5 * 1024 * 1024
            ) {
              this.error = getText('error_invalidImageSize', [
                getText(`engineName_${this.engine}`),
                getText('unit_mb', '5')
              ]);
            }

            if (!this.error) {
              const rsp = await fetch(params.imgData.objectUrl);
              params.blob = await rsp.blob();
            }

            await browser.runtime.sendMessage({
              id: 'dataReceipt',
              dataKey: params.imgData.dataKey
            });
          }

          if (!this.error) {
            try {
              await this.processImgData(params);
            } catch (err) {
              this.error = getText(
                'error_engine',
                getText(`engineName_${this.engine}`)
              );

              console.log(err.toString());
              throw err;
            }
          }
        }
      }
    },

    processImgData: async function({imgData, blob}) {
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

      if (this.engine === 'saucenao') {
        const data = new FormData();
        data.append('file', blob, 'Image');
        const rsp = await fetch('https://tmp.saucenao.com', {
          referrer: '',
          mode: 'cors',
          method: 'POST',
          body: data
        });
        const imgUrl = (await rsp.json()).url;
        const tabUrl = engines.saucenao.url.target.replace(
          '{imgUrl}',
          encodeURIComponent(imgUrl)
        );

        window.location.replace(tabUrl);
      }

      if (this.engine === 'shutterstock') {
        const data = new FormData();
        data.append('image', blob, imgData.filename);
        const rsp = await fetch(
          'https://www.shutterstock.com/discover/search/upload/images',
          {
            referrer: '',
            mode: 'cors',
            method: 'POST',
            body: data
          }
        );

        if (rsp.status !== 200) {
          this.error = getText('error_invalidImageSize', [
            getText('engineName_shutterstock'),
            getText('unit_mb', '5')
          ]);
          return;
        }

        const results = (await rsp.json()).response.docs;
        const ids = encodeURIComponent(results.map(item => item.id).join(','));
        const tabUrl = `https://www.shutterstock.com/search/ris/${ids}`;

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

    const supportedEngines = [
      'google',
      'karmaDecay',
      'saucenao',
      'shutterstock'
    ];
    if (!supportedEngines.includes(this.engine)) {
      this.error = getText('error_invalidPageUrl');
      this.dataLoaded = true;
      return;
    }

    document.title = getText('pageTitle', [
      getText(`optionTitle_${this.engine}`),
      getText('extensionName')
    ]);

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
      dataKey
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
  background-color: #ffffff;
}

#app {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 8px;
}

.error-icon {
  font-size: 72px;
  color: #e74c3c;
}

.error-text {
  @include mdc-typography(subtitle1);
  @include mdc-theme-prop(color, text-primary-on-light);
  max-width: 520px;
  margin-top: 24px;
}
</style>

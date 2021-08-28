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

import {validateUrl, getMaxImageSize, getLargeImageMessage} from 'utils/app';
import {getText, dataUrlToBlob} from 'utils/common';
import {engines} from 'utils/data';

export default {
  data: function () {
    return {
      dataLoaded: false,

      error: '',
      showSpinner: false,
      engine: ''
    };
  },

  methods: {
    search: async function ({session, search, image}) {
      if (this.engine === 'google') {
        const data = new FormData();
        data.append('encoded_image', image.imageBlob, image.imageFilename);
        const rsp = await fetch('https://www.google.com/searchbyimage/upload', {
          referrer: '',
          mode: 'cors',
          method: 'POST',
          body: data
        });

        if (rsp.status !== 200) {
          throw new Error(`API response: ${rsp.status}, ${await rsp.text()}`);
        }

        let tabUrl = rsp.url;

        if (!session.options.localGoogle) {
          tabUrl = tabUrl.replace(
            /(.*google\.)[a-zA-Z0-9_\-.]+(\/.*)/,
            '$1com$2&gl=US'
          );
        }

        if (validateUrl(tabUrl)) {
          window.location.replace(tabUrl);
        }
      } else if (this.engine === 'saucenao') {
        const data = new FormData();
        data.append('file', image.imageBlob, 'Image');
        const rsp = await fetch('https://tmp.saucenao.com', {
          referrer: '',
          mode: 'cors',
          method: 'POST',
          body: data
        });

        if (rsp.status !== 200) {
          throw new Error(`API response: ${rsp.status}, ${await rsp.text()}`);
        }

        const imgUrl = (await rsp.json()).url;
        const tabUrl = engines.saucenao.url.target.replace(
          '{imgUrl}',
          encodeURIComponent(imgUrl)
        );

        if (validateUrl(tabUrl)) {
          window.location.replace(tabUrl);
        }
      } else if (this.engine === 'sogou') {
        const data = new FormData();
        data.append('flag', '1');
        data.append('pic_path', image.imageBlob, image.imageFilename);

        const rsp = await fetch('https://pic.sogou.com/ris_upload', {
          referrer: '',
          mode: 'cors',
          method: 'POST',
          body: data
        });

        if (rsp.status !== 200) {
          throw new Error(`API response: ${rsp.status}, ${await rsp.text()}`);
        }

        const tabUrl = rsp.url;

        if (validateUrl(tabUrl)) {
          window.location.replace(tabUrl);
        }
      }
    }
  },

  created: async function () {
    const storageId = new URL(window.location.href).searchParams.get('id');

    const task = await browser.runtime.sendMessage({
      id: 'storageRequest',
      asyncResponse: true,
      saveReceipt: true,
      storageId
    });

    if (task) {
      try {
        this.engine = task.search.engine;

        document.title = getText('pageTitle', [
          getText(`optionTitle_${this.engine}`),
          getText('extensionName')
        ]);

        if (task.search.method === 'upload') {
          const maxSize = getMaxImageSize(this.engine);
          if (task.search.imageSize > maxSize) {
            this.error = getLargeImageMessage(this.engine, maxSize);
            this.dataLoaded = true;
            return;
          }
        }

        this.showSpinner = true;
        this.dataLoaded = true;

        const image = await browser.runtime.sendMessage({
          id: 'storageRequest',
          asyncResponse: true,
          saveReceipt: true,
          storageId: task.imageId
        });

        if (image) {
          if (task.search.method === 'upload') {
            image.imageBlob = dataUrlToBlob(image.imageDataUrl);
          }
          await this.search({
            session: task.session,
            search: task.search,
            image
          });
        } else {
          this.error = getText('error_invalidPageUrl');
        }
      } catch (err) {
        this.error = getText(
          'error_engine',
          getText(`engineName_${this.engine}`)
        );
        this.dataLoaded = true;

        console.log(err.toString());
        throw err;
      }
    } else {
      this.error = getText('error_invalidPageUrl');
      this.dataLoaded = true;
    }
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

.firefox.android {
  & .error-text {
    @include mdc-theme-prop(color, #20123a);
  }
}
</style>

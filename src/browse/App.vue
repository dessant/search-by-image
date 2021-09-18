<template>
  <div id="app" v-if="dataLoaded">
    <input
      class="drop-zone"
      ref="dropZone"
      v-show="dropEnabled && !showSpinner && !error"
      @cut.prevent
      @copy.prevent
      @paste.prevent="handleFiles($event, 'paste')"
      @drop.prevent="handleFiles($event, 'drop')"
      @dragenter.prevent="dropState = true"
      @dragexit.prevent="dropState = false"
      @dragend.prevent="dropState = false"
      @dragover.prevent
    />

    <div class="drop-zone-content" v-show="!showSpinner && !error">
      <img
        class="drop-zone-icon"
        :src="
          $isSamsung
            ? `/src/assets/samsung/icons/browse/drop-zone-${
                dropState ? 'drop' : 'drag'
              }.svg`
            : `/src/assets/icons/browse/drop-zone-${
                dropState ? 'drop' : 'drag'
              }.svg`
        "
      />

      <div class="drop-zone-text">
        {{
          dropEnabled
            ? getText(`pageContent_browse_${dropState ? 'drop' : 'drag'}`)
            : getText('pageContent_browse')
        }}
      </div>

      <div class="browse-button-wrap">
        <input
          ref="input"
          class="image-input"
          type="file"
          accept="image/*"
          multiple
          @change="handleFiles($event, 'input')"
        />
        <v-button
          class="browse-button"
          v-show="!dropState"
          outlined
          :label="getText('buttonText_browse')"
          @click="$refs.input.click()"
        ></v-button>
      </div>
    </div>

    <div v-show="showSpinner && !error" class="sk-rotating-plane"></div>

    <div v-show="error">
      <div class="error-icon">:/</div>
      <div class="error-text">{{ error }}</div>
    </div>
  </div>
</template>

<script>
import browser from 'webextension-polyfill';
import {Button} from 'ext-components';

import {normalizeFilename, normalizeImage} from 'utils/app';
import {getText} from 'utils/common';

export default {
  components: {
    [Button.name]: Button
  },

  data: function () {
    return {
      dataLoaded: false,

      showSpinner: false,
      dropState: false,
      dropEnabled: false,
      error: '',
      session: null
    };
  },

  methods: {
    getText,

    handleFiles: async function (ev, source) {
      let files;
      if (source === 'input') {
        files = ev.target.files;
      } else if (source === 'drop') {
        files = ev.dataTransfer.files;
      } else if (source === 'paste') {
        files = ev.clipboardData.files;
      }

      if (files.length > 3) {
        browser.runtime.sendMessage({
          id: 'notification',
          messageId: 'error_invalidImageCount'
        });
        if (source === 'drop') {
          this.dropState = false;
        }
        return;
      }

      const images = [];
      for (let file of files) {
        const {dataUrl, type, ext} = await normalizeImage({blob: file});
        if (dataUrl) {
          const filename = normalizeFilename({filename: file.name, ext});
          images.push({
            imageDataUrl: dataUrl,
            imageFilename: filename,
            imageType: type,
            imageExt: ext,
            imageSize: file.size
          });
        }
      }
      if (images.length > 0) {
        browser.runtime.sendMessage({
          id: 'imageUploadSubmit',
          images,
          session: this.session
        });
        this.showSpinner = true;
      } else {
        browser.runtime.sendMessage({
          id: 'notification',
          messageId: 'error_invalidImageFile'
        });
      }

      if (source === 'drop') {
        this.dropState = false;
      }
    }
  },

  created: async function () {
    document.title = getText('pageTitle', [
      getText('pageTitle_browse'),
      getText('extensionName')
    ]);
  },

  mounted: async function () {
    const storageId = new URL(window.location.href).searchParams.get('id');

    const session = await browser.runtime.sendMessage({
      id: 'storageRequest',
      asyncResponse: true,
      saveReceipt: true,
      storageId
    });

    if (session) {
      this.session = session;
      this.$nextTick(() => this.$refs.dropZone.focus());
    } else {
      this.error = getText('error_invalidPageUrl');
    }

    if (!this.$isAndroid) {
      this.dropEnabled = true;
    }

    this.dataLoaded = true;
  }
};
</script>

<style lang="scss">
$spinkit-size: 36px;
$spinkit-spinner-color: #e74c3c;
$mdc-theme-primary: #1abc9c;

@import 'spinkit/scss/spinners/1-rotating-plane';
@import '@material/button/mixins';
@import '@material/ripple/mixins';
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
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drop-zone,
.drop-zone-content {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.drop-zone {
  border: none;
  color: transparent;
  cursor: default;
  user-select: none;
}

.drop-zone-content {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  pointer-events: none;
  background-color: #fff;
}

.drop-zone-text {
  margin-top: 24px;
}

.drop-zone-icon {
  width: 96px;
  height: 96px;
}

.browse-button-wrap {
  height: 36px;
  margin-top: 56px;
}

.image-input {
  display: none;
}

.browse-button {
  pointer-events: auto;
}

.error-text,
.drop-zone-text {
  @include mdc-typography(subtitle1);
  @include mdc-theme-prop(color, text-primary-on-light);
}

.error-icon {
  font-size: 96px;
  color: #e74c3c;
}

.error-text {
  max-width: 520px;
  margin-top: 36px;
}

.samsung {
  & .error-text,
  & .drop-zone-text {
    @include mdc-theme-prop(color, #252525);
  }

  & .browse-button {
    @include mdc-button-ink-color(#4e5bb6);
    @include mdc-button-outline-color(#4e5bb6);

    & .mdc-button__ripple {
      @include mdc-states-base-color(#8188e9);
    }
  }
}

.firefox.android {
  & .error-text,
  & .drop-zone-text {
    @include mdc-theme-prop(color, #20123a);
  }

  & .browse-button {
    @include mdc-button-ink-color(#20123a);
    @include mdc-button-outline-color(#20123a);

    & .mdc-button__ripple {
      @include mdc-states-base-color(#312a65);
    }
  }
}
</style>

<template>
<div id="app" v-show="dataLoaded">
  <div class="drop-zone" v-show="!showSpinner && !error"
      @drop.prevent="handleFiles($event, 'drop')"
      @dragenter.prevent="dropState = true"
      @dragexit.prevent="dropState = false"
      @dragend.prevent="dropState = false"
      @dragover.prevent>
    <img class="drop-zone-icon"
        :src="`/src/icons/browse/drop-zone-${dropState ? 'drop' : 'drag'}.svg`">
    <div class="drop-zone-content">
      <input ref="input" class="image-input" type="file"
          accept="image/*" multiple @change="handleFiles">
      <v-button class="browse-button" v-show="!dropState"
          :compact="true" :stroked="true"
          @click="$refs.input.click()">
        {{ getText('buttonText_browse') }}
      </v-button>
      <div class="drop-zone-text">
        {{ getText(`pageContent_browse_${dropState ? 'drop' : 'drag'}`) }}
      </div>
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

import {getEnabledEngines} from 'utils/app';
import {getText} from 'utils/common';
import Button from 'components/Button';

export default {
  components: {
    [Button.name]: Button
  },

  data: function() {
    return {
      dataLoaded: false,

      showSpinner: false,
      dropState: false,
      error: '',
      engine: ''
    };
  },

  methods: {
    getText: getText,

    handleFiles: async function(e, source = 'input') {
      const images = [];
      const files = source === 'input' ? e.target.files : e.dataTransfer.files;

      if (files.length > 3) {
        browser.runtime.sendMessage({
          id: 'notification',
          messageId: 'error_invalidImageCount'
        });
        this.dropState = false;
        return;
      }

      for (let file of files) {
        if (file.type.startsWith('image/')) {
          images.push({
            objectUrl: URL.createObjectURL(file),
            info: {filename: file.name}
          });
        }
      }
      let searchCount = images.length;
      if (searchCount > 0) {
        if (this.engine === 'allEngines') {
          searchCount = (await getEnabledEngines()).length * searchCount;
        }

        browser.runtime.sendMessage({
          id: 'imageUploadSubmit',
          engine: this.engine,
          searchCount,
          images
        });
        this.showSpinner = true;
      } else {
        browser.runtime.sendMessage({
          id: 'notification',
          messageId: 'error_invalidImageFile'
        });
      }

      this.dropState = false;
    }
  },

  created: async function() {
    document.title = getText('pageTitle', [
      getText('pageTitle_browse'),
      getText('extensionName')
    ]);

    const engine = new URL(window.location.href).searchParams.get('engine');
    if (
      engine &&
      (engine === 'allEngines' || (await getEnabledEngines()).includes(engine))
    ) {
      this.engine = engine;
    } else {
      this.error = getText('error_invalidPageUrl');
      this.dataLoaded = true;
      return;
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
@import '@material/theme/mixins';
@import '@material/typography/mixins';

html,
body {
  height: 100%;
}

body {
  margin: 0;
}

#app,
.drop-zone {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drop-zone {
  flex-direction: column;
}

.drop-zone-content {
  height: 48px;
  margin-top: 24px;
  display: flex;
  align-items: center;
}

.drop-zone-icon {
  width: 128px;
  height: 128px;
  opacity: .5;
}

.image-input {
  display: none;
}

.browse-button {
  margin-right: 8px;
}

.error-text,
.drop-zone-text {
  @include mdc-typography('subheading2');
  @include mdc-theme-prop('color', 'text-primary-on-light');
}

.error-icon {
  font-size: 96px;
  color: #e74c3c;
}

.error-text {
  max-width: 520px;
  margin-top: 36px;
}
</style>

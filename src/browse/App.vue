<template>
  <div id="app" v-if="dataLoaded" :class="appClasses">
    <div class="browse-wrap" v-if="!isShare && !showSpinner && !error">
      <input
        class="drop-zone"
        ref="dropZone"
        v-show="dropEnabled"
        @cut.prevent
        @copy.prevent
        @paste.prevent="handleSelectedFiles($event, 'paste')"
        @drop.prevent="handleSelectedFiles($event, 'drop')"
        @dragenter.prevent="dropState = true"
        @dragexit.prevent="dropState = false"
        @dragend.prevent="dropState = false"
        @dragover.prevent
      />

      <div class="drop-zone-content">
        <img
          class="drop-zone-icon"
          :src="`/src/assets/icons/browse/drop-zone-${
            dropState ? 'drop' : 'drag'
          }.svg`"
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
            @change="handleSelectedFiles($event, 'input')"
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
    </div>

    <div class="share-wrap" v-if="isShare && !showSpinner && !error">
      <div class="image-container">
        <div class="tile-container" v-for="(img, index) in images" :key="index">
          <img
            class="tile"
            referrerpolicy="no-referrer"
            :src="img.imageDataUrl"
          />
        </div>
      </div>

      <div class="list-container">
        <ul class="mdc-list list list-bulk-button" v-if="searchAllEngines">
          <li class="mdc-list-item list-item" @click="selectItem('allEngines')">
            <img
              class="mdc-list-item__graphic list-item-icon"
              :src="getEngineIcon('allEngines')"
            />
            {{ getText('menuItemTitle_allEngines') }}
          </li>
        </ul>

        <ul class="mdc-list list list-separator">
          <li role="separator" class="mdc-list-divider"></li>
        </ul>

        <ul class="mdc-list list list-items">
          <li
            class="mdc-list-item list-item"
            v-for="engine in engines"
            :key="engine.id"
            @click="selectItem(engine)"
          >
            <img
              class="mdc-list-item__graphic list-item-icon"
              :src="getEngineIcon(engine)"
            />
            {{ getText(`menuItemTitle_${engine}`) }}
          </li>
        </ul>
      </div>
    </div>

    <div v-if="showSpinner && !error" class="sk-rotating-plane"></div>

    <div v-if="error">
      <div class="error-icon">:/</div>
      <div class="error-text">{{ error }}</div>
    </div>
  </div>
</template>

<script>
import browser from 'webextension-polyfill';
import {validate as uuidValidate} from 'uuid';
import {MDCList} from '@material/list';
import {MDCRipple} from '@material/ripple';
import {Button} from 'ext-components';

import storage from 'storage/storage';
import {
  getEnabledEngines,
  createSession,
  normalizeFilename,
  normalizeImage,
  fileExtToMimeType
} from 'utils/app';
import {getText, dataUrlToBlob} from 'utils/common';
import {optionKeys} from 'utils/data';

export default {
  components: {
    [Button.name]: Button
  },

  data: function () {
    return {
      dataLoaded: false,

      isShare: false,

      showSpinner: false,
      dropState: false,
      dropEnabled: false,
      error: '',
      session: null,

      images: [],
      engines: [],
      searchAllEngines: false
    };
  },

  computed: {
    appClasses: function () {
      return {
        'list-separator-hidden': !this.searchAllEngines,
        'browse-view': !this.isShare,
        'share-view': this.isShare
      };
    }
  },

  methods: {
    getText,

    getEngineIcon: function (engine) {
      let ext = 'svg';
      if (
        ['iqdb', 'karmaDecay', 'tineye', 'whatanime', 'repostSleuth'].includes(
          engine
        )
      ) {
        ext = 'png';
      } else if (['branddb', 'madridMonitor'].includes(engine)) {
        engine = 'wipo';
      }
      return `/src/assets/icons/engines/${engine}.${ext}`;
    },

    setup: async function () {
      if (this.isShare) {
        const shareId = new URL(window.location.href).searchParams.get('id');

        if (uuidValidate(shareId)) {
          const response = await browser.runtime.sendNativeMessage(
            'application.id',
            {id: 'getSharedImage', shareId}
          );

          if (response) {
            const imageBlob = dataUrlToBlob(
              `data:${
                fileExtToMimeType(response.imageExt) || 'text/plain'
              };base64,${response.imageDataStr}`
            );

            const {dataUrl, type, ext} = await normalizeImage({
              blob: imageBlob
            });
            if (dataUrl) {
              const filename = normalizeFilename({filename: '', ext});
              this.images.push({
                imageDataUrl: dataUrl,
                imageFilename: filename,
                imageType: type,
                imageExt: ext,
                imageSize: imageBlob.size
              });
            }
          } else {
            this.error = getText('error_invalidPageUrl');
          }
        } else {
          this.error = getText('error_invalidPageUrl');
        }

        if (this.images.length) {
          const options = await storage.get(optionKeys);
          const enEngines = await getEnabledEngines(options);

          this.engines = enEngines;
          this.searchAllEngines =
            options.searchAllEnginesAction === 'sub' && !this.$isSamsung;
        } else {
          this.error = getText('error_invalidPageUrl');
        }
      } else {
        const storageId = new URL(window.location.href).searchParams.get('id');

        const session = await browser.runtime.sendMessage({
          id: 'storageRequest',
          asyncResponse: true,
          saveReceipt: true,
          storageId
        });

        if (session) {
          this.session = session;
        } else {
          this.error = getText('error_invalidPageUrl');
        }

        if (!this.$isMobile) {
          this.dropEnabled = true;
        }
      }

      this.dataLoaded = true;
    },

    getEngineIcon: function (engine) {
      let ext = 'svg';
      if (
        ['iqdb', 'karmaDecay', 'tineye', 'whatanime', 'repostSleuth'].includes(
          engine
        )
      ) {
        ext = 'png';
      } else if (['branddb', 'madridMonitor'].includes(engine)) {
        engine = 'wipo';
      }
      return `/src/assets/icons/engines/${engine}.${ext}`;
    },

    selectItem: async function (engine) {
      const tab = browser.tabs.getCurrent();

      const session = await createSession({
        sessionOrigin: 'share',
        searchMode: 'upload',
        sourceTabId: tab.id,
        sourceTabIndex: tab.index,
        engine
      });

      browser.runtime.sendMessage({
        id: 'imageUploadSubmit',
        images: this.images,
        session
      });
    },

    handleSelectedFiles: async function (ev, source) {
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

  created: function () {
    document.title = getText('pageTitle', [
      getText('pageTitle_browse'),
      getText('extensionName')
    ]);

    this.isShare =
      new URL(window.location.href).searchParams.get('origin') === 'share';

    this.setup();
  },

  mounted: function () {
    if (this.isShare) {
      window.setTimeout(() => {
        for (const listEl of document.querySelectorAll(
          '.list-bulk-button, .list-items'
        )) {
          const list = new MDCList(listEl);
          for (const el of list.listElements) {
            MDCRipple.attachTo(el);
          }
        }
      }, 500);
    }
  }
};
</script>

<style lang="scss">
$spinkit-size: 36px;
$spinkit-spinner-color: #e74c3c;

@import 'spinkit/scss/spinners/1-rotating-plane';
@import '@material/list/mdc-list';
@import '@material/button/mixins';
@import '@material/ripple/mixins';
@import '@material/theme/mixins';
@import '@material/typography/mixins';

html,
body,
#app {
  width: 100%;
  height: 100%;
}

body {
  margin: 0;
  @include mdc-typography-base;
  font-size: 100%;
}

#app {
  display: flex;
  justify-content: center;
}

#app.browse-view {
  align-items: center;

  & .drop-zone,
  & .drop-zone-content {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  & .drop-zone {
    border: none;
    color: transparent;
    cursor: default;
    user-select: none;
  }

  & .drop-zone-content {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    pointer-events: none;
    background-color: #fff;
  }

  & .drop-zone-text {
    @include mdc-typography(subtitle1);
    @include mdc-theme-prop(color, #252525);
    margin-top: 16px;
    @media (min-height: 480px) {
      margin-top: 24px;
    }
  }

  & .drop-zone-icon {
    width: 128px;
    height: 128px;
  }

  & .browse-button-wrap {
    height: 36px;
    margin-top: 72px;
    @media (min-height: 480px) {
      margin-top: 96px;
    }
  }

  & .image-input {
    display: none;
  }

  & .browse-button {
    pointer-events: auto;

    @include mdc-button-ink-color(#4e5bb6);
    @include mdc-button-outline-color(#4e5bb6);
    @include mdc-button-shape-radius(16px);

    & .mdc-button__ripple {
      @include mdc-states-base-color(#8188e9);
    }
  }
}

#app.share-view {
  align-items: flex-start;
  overflow-x: auto;
  background-color: #f2f2f7;

  & .share-wrap {
    width: 100%;
    padding: 16px;
  }

  & .image-container {
    margin-bottom: 16px;
    display: flex;
  }

  & .tile-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 120px;
    height: 90px;
  }

  & .tile {
    max-width: calc(100% - 16px);
    max-height: calc(100% - 16px);
    object-fit: scale-down;

    border-radius: 8px;
    box-shadow: 0px 3px 5px -1px rgba(0, 0, 0, 0.12),
      0px 6px 10px 0px rgba(0, 0, 0, 0.08), 0px 1px 12px 0px rgba(0, 0, 0, 0.06);
  }

  & .list-container {
    border-radius: 16px;
    background-color: #ffffff;
  }

  & .list {
    padding: 0 !important;
  }

  & .list-bulk-button {
    position: relative;
    height: 48px;
  }

  & .list-bulk-button li {
    border-radius: 16px 16px 0px 0px;
  }

  & .list-separator {
    position: relative;
    height: 1px;
  }

  &.list-separator-hidden .list-separator {
    display: none;
  }

  & .mdc-list-divider {
    margin-left: 56px;
  }

  & .list-items-wrap {
    overflow-y: auto;
  }

  &.list-separator-hidden .list-items li:first-child {
    border-radius: 16px 16px 0px 0px;
  }

  & .list-items li:last-child {
    border-radius: 0px 0px 16px 16px;
  }

  & .list-item {
    padding-left: 16px;
    padding-right: 48px;
    cursor: pointer;
  }

  & .list-item-icon {
    margin-right: 16px !important;
  }

  & .mdc-list {
    padding: 0;
  }

  & .mdc-list-item {
    @include mdc-theme-prop(color, #252525);
  }
}

.error-icon {
  font-size: 96px;
  color: #e74c3c;
}

.error-text {
  @include mdc-typography(subtitle1);
  @include mdc-theme-prop(color, #252525);
  max-width: 520px;
  margin-top: 36px;
}

.safari {
  & #app.browse-view {
    & .browse-button {
      -webkit-mask-image: -webkit-radial-gradient(white, black);
    }
  }

  & #app.share-view {
    & .list-bulk-button li,
    &.list-separator-hidden .list-items li:first-child,
    & .list-items li:last-child {
      -webkit-mask-image: -webkit-radial-gradient(white, black);
      transform: translate3d(0px, 0px, 0px);
    }
  }

  &.macos {
    & #app.browse-view {
      & .browse-button {
        transform: translate3d(0px, 0px, 0px);
      }
    }
  }
}

/* tablets */
@media (min-width: 480px) {
  #app.share-view {
    & .share-wrap {
      width: auto;
      min-width: 320px;
    }
  }
}
</style>

<template>
  <div id="app" v-if="dataLoaded" :class="appClasses">
    <div class="browse-content" v-if="!isShare && !showSpinner && !showError">
      <div class="browse-area" v-show="showBrowseArea">
        <div
          class="drop-zone"
          v-if="dropEnabled"
          @drop.prevent="onFileEvent($event, 'drop-event')"
          @dragstart.prevent="dropState = true"
          @dragend="dropState = false"
          @dragenter.prevent="dropState = true"
          @dragleave="dropState = false"
          @dragover.prevent
        ></div>

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

          <div class="browse-buttons" v-show="!dropState">
            <input
              ref="browseInput"
              class="browse-input"
              type="file"
              accept="image/*"
              multiple
              @change="onFileEvent($event, 'input-event')"
            />
            <v-button
              class="outline-button"
              outlined
              :label="getText('buttonText_browse')"
              :disabled="processing"
              @click="onBrowseButtonClick"
            ></v-button>
            <v-button
              class="outline-button"
              v-if="pasteEnabled"
              outlined
              :label="getText('buttonText_paste')"
              :disabled="processing"
              @click="onPasteButtonClick"
            ></v-button>
          </div>
        </div>
      </div>

      <div class="browse-preview" v-show="previewImages">
        <div class="preview-images">
          <picture
            class="tile-container"
            v-for="(img, index) in previewImages"
            :key="index"
          >
            <source :srcset="img.objectUrl" :type="img.image.type" />
            <img
              class="tile"
              referrerpolicy="no-referrer"
              src="/src/assets/icons/misc/broken-image.svg"
              @error.once="setBrokenPreviewImage"
              :alt="img.image.name"
            />
          </picture>
        </div>

        <div class="preview-buttons">
          <v-button
            class="outline-button"
            outlined
            :label="getText('buttonText_cancel')"
            :disabled="processing"
            @click="onCancelButtonClick"
          ></v-button>
          <v-button
            class="outline-button"
            outlined
            :label="getText('buttonText_search')"
            :disabled="processing"
            @click="onSearchButtonClick"
          ></v-button>
        </div>
      </div>
    </div>

    <div class="share-content" v-if="isShare && !showSpinner && !showError">
      <div class="preview-images">
        <picture
          class="tile-container"
          v-for="(img, index) in previewImages"
          :key="index"
        >
          <source :srcset="img.objectUrl" :type="img.image.type" />
          <img
            class="tile"
            referrerpolicy="no-referrer"
            src="/src/assets/icons/misc/broken-image.svg"
            @error.once="setBrokenPreviewImage"
            :alt="img.image.name"
          />
        </picture>
      </div>

      <div class="list-container">
        <ul class="mdc-list list list-bulk-button" v-if="searchAllEngines">
          <li
            class="mdc-list-item list-item"
            @click="onEngineClick('allEngines')"
          >
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
            @click="onEngineClick(engine)"
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

    <div class="error-content" v-if="showError">
      <img class="error-icon" src="/src/assets/icons/misc/error.svg" />
      <div class="error-text">{{ showError }}</div>
    </div>

    <div
      v-if="showSpinner && !showError"
      class="spinner sk-rotating-plane"
    ></div>
  </div>
</template>

<script>
import browser from 'webextension-polyfill';
import {MDCList} from '@material/list';
import {MDCRipple} from '@material/ripple';
import {Button} from 'ext-components';

import storage from 'storage/storage';
import {
  getEnabledEngines,
  showNotification,
  createSession,
  dataToImage,
  normalizeImages,
  processImages,
  imageFileExtToMimeType,
  getFilesFromClipboard,
  getEngineIcon,
  validateShareId
} from 'utils/app';
import {getText} from 'utils/common';
import {optionKeys} from 'utils/data';

export default {
  components: {
    [Button.name]: Button
  },

  data: function () {
    return {
      dataLoaded: false,
      processing: false,

      isShare: false,

      showSpinner: false,
      showError: '',

      dropState: false,
      showBrowseArea: true,

      previewImages: null,
      session: null,

      engines: [],
      searchAllEngines: false,

      pasteEnabled: false,
      dropEnabled: false,

      confirmPaste: false
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

    getEngineIcon,

    initSetup: async function () {
      try {
        await this.setup();
      } catch (err) {
        await showNotification({messageId: 'error_internalError'});

        throw err;
      } finally {
        this.dataLoaded = true;
      }
    },

    setup: async function () {
      const options = await storage.get(optionKeys);

      if (this.isShare) {
        const shareIds = new URL(window.location.href).searchParams.get('id');

        const enEngines = await getEnabledEngines(options);

        if (await validateShareId(shareIds)) {
          const images = [];

          for (const shareId of shareIds.split('_')) {
            const response = await browser.runtime.sendNativeMessage(
              'application.id',
              {id: 'getSharedImage', shareId}
            );

            if (response) {
              const dataUrl = `data:${
                imageFileExtToMimeType(response.imageExt) ||
                'application/octet-stream'
              };base64,${response.imageDataStr}`;

              const image = await dataToImage({dataUrl});

              if (image) {
                images.push(image);
              }
            } else {
              this.showError = getText('error_invalidPageUrl');
              return;
            }
          }

          if (images.length) {
            let engine;
            if (enEngines.length === 1) {
              engine = enEngines[0];
            } else if (
              enEngines.length > 1 &&
              options.searchAllEnginesAction === 'main'
            ) {
              engine = 'allEngines';
            }

            if (engine) {
              await this.initShareSearch({engine, images});
            } else {
              this.addPreviewImages(images);

              this.engines = enEngines;
              this.searchAllEngines =
                options.searchAllEnginesAction === 'sub' &&
                !this.$env.isSamsung;
            }
          } else {
            this.showError = getText('error_invalidImageFile');
          }
        } else {
          this.showError = getText('error_invalidPageUrl');
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

          this.dropEnabled = !this.$env.isAndroid;

          this.pasteEnabled =
            !this.$env.isSamsung &&
            !(this.$env.isMobile && this.$env.isFirefox);

          this.confirmPaste = options.confirmPaste;

          if (this.pasteEnabled) {
            window.addEventListener('paste', this.onPasteEvent, {
              capture: true,
              passive: false
            });
          }
        } else {
          this.showError = getText('error_invalidPageUrl');
        }
      }
    },

    startProcessing: function () {
      if (!this.processing) {
        this.processing = true;
        return true;
      }
    },

    stopProcessing: function () {
      this.processing = false;
    },

    onEngineClick: async function (engine) {
      if (!this.startProcessing()) return;

      try {
        await this.initShareSearch({engine});
      } catch (err) {
        this.stopProcessing();
        await showNotification({messageId: 'error_internalError'});

        throw err;
      }
    },

    onCancelButtonClick: function () {
      if (!this.processing) {
        this.hidePreviewImages();
      }
    },

    onSearchButtonClick: async function () {
      if (!this.startProcessing()) return;

      try {
        await this.initSearch();
      } catch (err) {
        this.stopProcessing();
        await showNotification({messageId: 'error_internalError'});

        throw err;
      }
    },

    onBrowseButtonClick: function () {
      if (!this.processing) {
        this.$refs.browseInput.click();
      }
    },

    onPasteButtonClick: function () {
      if (!this.startProcessing()) return;

      this.processClipboardImages().finally(() => {
        this.stopProcessing();
      });
    },

    onFileEvent: function (ev, source) {
      if (!this.startProcessing()) return;

      let files;
      if (source === 'input-event') {
        files = ev.target.files;
      } else if (source === 'drop-event') {
        files = ev.dataTransfer.files;
      }

      this.processSelectedImages(files).finally(() => {
        this.stopProcessing();
        if (source === 'drop-event') {
          this.dropState = false;
        }
      });
    },

    onPasteEvent: function (ev) {
      if (!this.startProcessing()) return;

      ev.preventDefault();
      ev.stopImmediatePropagation();

      if (this.showSpinner || this.showError) {
        this.stopProcessing();
        return;
      }

      const files = Array.prototype.slice.call(ev.clipboardData.files, 0, 3);

      this.processClipboardImages(files).finally(() => {
        this.stopProcessing();
      });
    },

    processClipboardImages: async function (files) {
      try {
        if (!files) {
          files = await getFilesFromClipboard();
        }

        const images = await normalizeImages(files);

        if (images) {
          if (this.confirmPaste) {
            this.showPreviewImages(images);
          } else {
            await this.initSearch(images);
          }
        } else {
          await showNotification({messageId: 'error_invalidImageFile'});
        }
      } catch (err) {
        await showNotification({messageId: 'error_internalError'});

        throw err;
      }
    },

    processSelectedImages: async function (files) {
      try {
        if (files.length > 3) {
          await showNotification({messageId: 'error_invalidImageCount'});
          return;
        }

        const images = await normalizeImages(files);

        if (images) {
          await this.initSearch(images);
        } else {
          await showNotification({messageId: 'error_invalidImageFile'});
        }
      } catch (err) {
        await showNotification({messageId: 'error_internalError'});

        throw err;
      }
    },

    showPreviewImages: function (images) {
      this.showBrowseArea = false;
      this.addPreviewImages(images);
    },

    hidePreviewImages: function () {
      this.removePreviewImages();
      this.showBrowseArea = true;
    },

    addPreviewImages: function (images) {
      if (images) {
        this.previewImages = images.map(image => ({
          image,
          objectUrl: URL.createObjectURL(image)
        }));
      }
    },

    removePreviewImages: function () {
      if (this.previewImages) {
        this.previewImages.forEach(image =>
          URL.revokeObjectURL(image.objectUrl)
        );
        this.previewImages = null;
      }
    },

    setBrokenPreviewImage: function (ev) {
      const source = ev.target.previousElementSibling;
      source.srcset = ev.target.src;
      source.type = 'image/svg+xml';
    },

    initShareSearch: async function ({engine, images} = {}) {
      const tab = browser.tabs.getCurrent();

      this.session = await createSession({
        sessionOrigin: 'share',
        searchMode: 'upload',
        sourceTabId: tab.id,
        sourceTabIndex: tab.index,
        engine
      });

      await this.initSearch(images);
    },

    initSearch: async function (images) {
      this.showSpinner = true;

      try {
        const files = images || this.previewImages.map(item => item.image);

        images = await processImages(files);
        if (!images) {
          throw new Error('cannot process images');
        }

        await browser.runtime.sendMessage({
          id: 'imageUploadSubmit',
          images,
          session: this.session
        });
      } catch (err) {
        this.showSpinner = false;
        throw err;
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

    this.initSetup();
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
  justify-content: safe center;
}

#app.browse-view {
  align-items: safe center;

  & .browse-content {
    // workaround for 'safe center'
    margin: auto;
  }

  & .drop-zone {
    position: fixed;
    top: 16px;
    right: 16px;
    bottom: 16px;
    left: 16px;
    width: calc(100% - 32px);
    height: calc(100% - 32px);
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

  & .browse-buttons {
    display: grid;
    grid-auto-flow: column;
    grid-column-gap: 24px;
    height: 36px;
    margin-top: 72px;
    @media (min-height: 480px) {
      margin-top: 96px;
    }

    & .outline-button {
      pointer-events: auto;
    }
  }

  & .browse-input {
    display: none;
  }

  .browse-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: 960px;
    padding: 16px;

    & .preview-images {
      display: grid;
      grid-auto-flow: column;
      grid-column-gap: 16px;
    }

    & .tile-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 96px;
      @media (min-height: 480px) {
        height: 120px;
      }
    }

    & .tile {
      display: flex;
      object-fit: scale-down;
      max-width: 100%;
      max-height: 96px;
      @media (min-height: 480px) {
        max-height: 120px;
      }

      border-radius: 8px;
      box-shadow: 0px 3px 5px -1px rgba(0, 0, 0, 0.06),
        0px 6px 10px 0px rgba(0, 0, 0, 0.04),
        0px 1px 12px 0px rgba(0, 0, 0, 0.03);
    }

    & .preview-buttons {
      display: grid;
      grid-auto-flow: column;
      grid-column-gap: 24px;
      height: 36px;
      margin-top: 48px;
      @media (min-height: 480px) {
        margin-top: 72px;
      }
    }
  }

  & .outline-button {
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

  & .share-content {
    width: 100%;
    padding: 16px;
    padding-top: 32px;
    max-width: 960px;
  }

  & .preview-images {
    display: grid;
    grid-auto-flow: column;
    grid-column-gap: 16px;
    margin-bottom: 32px;
  }

  & .tile-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 96px;
  }

  & .tile {
    display: flex;
    object-fit: scale-down;
    max-width: 100%;
    max-height: 96px;

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

.error-content {
  display: flex;
  align-items: center;
  margin: auto;
  padding: 16px;

  & .error-icon {
    width: 48px;
    height: 48px;
    margin-right: 24px;
  }

  & .error-text {
    @include mdc-typography(subtitle1);
    @include mdc-theme-prop(color, #252525);
    max-width: 520px;
  }
}

.spinner {
  align-self: center;
}

.safari {
  & #app.browse-view {
    & .outline-button {
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
      & .outline-button {
        transform: translate3d(0px, 0px, 0px);
      }
    }
  }
}

/* tablets */
@media (min-width: 480px) {
  #app.share-view {
    & .share-content {
      width: auto;
      min-width: 320px;
    }
  }
}
</style>

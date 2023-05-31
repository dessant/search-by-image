<template>
  <vn-app v-if="dataLoaded" :class="appClasses">
    <div class="browse-content" v-if="!isShare && !showSpinner && !showError">
      <div v-show="showBrowseArea">
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
          <vn-icon
            class="drop-zone-icon"
            src="/src/assets/icons/misc/image.svg"
          ></vn-icon>

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

            <vn-button
              class="browse-button"
              :disabled="processing"
              @click="onBrowseButtonClick"
              variant="tonal"
            >
              {{ getText('buttonLabel_browse') }}
            </vn-button>
            <vn-button
              class="browse-button"
              v-if="pasteEnabled"
              :disabled="processing"
              @click="onPasteButtonClick"
              variant="tonal"
            >
              {{ getText('buttonLabel_paste') }}
            </vn-button>
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
              :src="`/src/assets/icons/misc/${
                theme === 'dark' ? 'broken-image-dark' : 'broken-image'
              }.svg`"
              @error.once="setBrokenPreviewImage"
              :alt="img.image.name"
            />
          </picture>
        </div>

        <div class="preview-buttons">
          <vn-button
            class="browse-button"
            :disabled="processing"
            @click="onCancelButtonClick"
            variant="text"
          >
            {{ getText('buttonLabel_cancel') }}
          </vn-button>
          <vn-button
            class="browse-button"
            :disabled="processing"
            @click="onSearchButtonClick"
            variant="tonal"
          >
            {{ getText('buttonLabel_search') }}
          </vn-button>
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
            :src="`/src/assets/icons/misc/${
              theme === 'dark' ? 'broken-image-dark' : 'broken-image'
            }.svg`"
            @error.once="setBrokenPreviewImage"
            :alt="img.image.name"
          />
        </picture>
      </div>

      <vn-list class="list-items">
        <vn-list-item
          v-if="searchAllEngines"
          :title="getText('menuItemTitle_allEngines')"
          @click="onEngineClick('allEngines')"
        >
          <template v-slot:prepend v-if="showEngineIcons">
            <img
              class="list-item-icon"
              v-if="showEngineIcons"
              :src="getEngineIcon('allEngines', {variant: theme})"
            />
          </template>
        </vn-list-item>

        <vn-divider class="list-separator" v-if="searchAllEngines"></vn-divider>

        <template v-for="item of engines">
          <vn-list-item
            :title="getText(`menuItemTitle_${item}`)"
            @click="onEngineClick(item)"
          >
            <template v-slot:prepend v-if="showEngineIcons">
              <img
                class="list-item-icon"
                :src="getEngineIcon(item, {variant: theme})"
              />
            </template>
          </vn-list-item>
        </template>
      </vn-list>
    </div>

    <div class="error-content" v-if="showError">
      <vn-icon
        class="error-icon"
        src="/src/assets/icons/misc/error.svg"
      ></vn-icon>
      <div class="error-text">{{ showError }}</div>
    </div>

    <img
      v-if="showSpinner && !showError"
      class="spinner"
      src="/src/assets/icons/misc/spinner.svg"
    />
  </vn-app>
</template>

<script>
import {markRaw} from 'vue';
import {App, Button, Divider, Icon, List, ListItem} from 'vueton';

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
  validateShareId,
  sendLargeMessage,
  getAppTheme
} from 'utils/app';
import {getText} from 'utils/common';
import {optionKeys} from 'utils/data';

export default {
  components: {
    [App.name]: App,
    [Button.name]: Button,
    [Divider.name]: Divider,
    [Icon.name]: Icon,
    [List.name]: List,
    [ListItem.name]: ListItem
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

      engines: [],
      searchAllEngines: false,
      showEngineIcons: false,

      pasteEnabled: false,
      dropEnabled: false,

      confirmPaste: false,

      theme: ''
    };
  },

  computed: {
    appClasses: function () {
      return {
        'browse-view': !this.isShare,
        'share-view': this.isShare,
        'drop-state': this.dropState
      };
    }
  },

  rawData: {
    session: null
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
              this.showEngineIcons = options.showEngineIcons;
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
          this.$options.rawData.session = session;

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

      this.theme = await getAppTheme(options.appTheme);
      document.addEventListener('themeChange', ev => {
        this.theme = ev.detail;
      });
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
          image: markRaw(image),
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
      this.$options.rawData.session = await createSession({
        sessionOrigin: 'share',
        sessionType: 'search',
        searchMode: 'browse',
        engine
      });

      await this.initSearch(images);
    },

    initSearch: async function (images) {
      this.showSpinner = true;

      try {
        const session = this.$options.rawData.session;
        session.closeSourceTab = true;

        const files = images || this.previewImages.map(item => item.image);

        images = await processImages(files);
        if (!images) {
          throw new Error('cannot process images');
        }

        await sendLargeMessage({
          message: {
            id: 'imageBrowseSubmit',
            session,
            images
          },
          openConnection: this.$env.isSafari
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
  }
};
</script>

<style lang="scss">
@use 'vueton/styles' as vueton;

@include vueton.theme-base;
@include vueton.transitions;

.v-application__wrap {
  display: flex;
  justify-content: safe center;
  flex-direction: row;
}

.browse-view {
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
  }

  & .drop-zone-text {
    @include vueton.md2-typography(subtitle1);
    margin-top: 16px;
    @media (min-height: 480px) {
      margin-top: 24px;
    }
  }

  & .drop-zone-icon {
    width: 128px;
    height: 128px;
    @include vueton.theme-prop(background-color, surface-variant);
  }

  &.drop-state {
    & .drop-zone-icon {
      background-color: var(--md-ref-palette-color6-1) !important;
    }
  }

  & .browse-buttons {
    display: grid;
    grid-auto-flow: column;
    grid-column-gap: 24px;
    height: 40px;
    margin-top: 72px;
    @media (min-height: 480px) {
      margin-top: 96px;
    }

    & .browse-button {
      pointer-events: auto;
      @include vueton.theme-prop(color, primary);
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
      height: 40px;
      margin-top: 48px;
      @media (min-height: 480px) {
        margin-top: 72px;
      }
    }
  }

  & .browse-button {
    @include vueton.theme-prop(color, primary);
  }
}

.share-view {
  align-items: flex-start;
  overflow-x: auto;

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

  & .list-items {
    border-radius: 16px;
  }

  & .list-separator {
    margin-top: -1px;
  }

  & .list-item-icon {
    width: 24px;
    height: 24px;
  }
}

.error-content {
  display: flex;
  align-items: center;
  padding: 16px;

  & .error-icon {
    width: 48px;
    height: 48px;
    min-width: 48px;
    min-height: 48px;
    margin-right: 24px;
    @include vueton.theme-prop(background-color, error);
  }

  & .error-text {
    @include vueton.md2-typography(subtitle1);
    max-width: 520px;
  }
}

.spinner {
  align-self: center;
  width: 36px;
  height: 36px;
}

.v-theme--light {
  &.share-view {
    background-color: var(--md-ref-palette-color5-1);
  }
}

.v-theme--dark {
  &.share-view {
    & .list-items {
      @include vueton.theme-prop(background-color, menu-surface);

      & .list-separator {
        @include vueton.theme-prop(border-color, outline-variant);
      }
    }
  }
}

/* tablets */
@media (min-width: 480px) {
  .share-view {
    & .share-content {
      width: auto;
      min-width: 320px;
    }
  }
}
</style>

<template>
  <vn-app v-if="dataLoaded">
    <div class="view-content" v-if="previewImage && !showError">
      <div class="image-header">
        <div class="image-url-container" v-if="previewImage.imageUrl">
          <a
            class="image-url-link"
            :href="previewImage.imageUrl"
            :title="previewImage.imageFilename"
            >{{ previewImage.imageUrl }}</a
          >

          <vn-icon-button
            src="/src/assets/icons/misc/content-copy.svg"
            :title="getText('buttonTooltip_copyImageUrl')"
            @click="copyImageUrl"
          ></vn-icon-button>
        </div>

        <div class="image-details-container">
          <div class="image-name-text">{{ previewImage.imageFilename }}</div>

          <div class="image-data-container" v-if="imageLoaded">
            <template v-for="(detail, index) in imageDetails" :key="index">
              <div class="image-data-separator" v-if="index">•</div>
              <div :class="{[`image-${detail.kind}-text`]: true}">
                {{ detail.text }}
              </div>
            </template>
          </div>
        </div>
      </div>

      <picture class="image-preview">
        <source
          :srcset="previewImage.imageDataUrl"
          :type="previewImage.imageType"
        />
        <img
          class="image"
          :src="`/src/assets/icons/misc/${
            theme === 'dark' ? 'broken-image-dark' : 'broken-image'
          }.svg`"
          @error.once="onPreviewImageError"
          @load="onPreviewImageLoad"
          :alt="previewImage.imageFilename"
        />
      </picture>
    </div>

    <div class="error-content" v-if="showError">
      <vn-icon
        class="error-icon"
        src="/src/assets/icons/misc/error.svg"
      ></vn-icon>
      <div class="error-text">{{ showError }}</div>
    </div>
  </vn-app>
</template>

<script>
import {App, Icon, IconButton} from 'vueton';

import {
  validateId,
  getFormattedImageDetails,
  isPreviewImageValid,
  sendLargeMessage,
  getAppTheme
} from 'utils/app';
import {getText} from 'utils/common';

export default {
  components: {
    [App.name]: App,
    [Icon.name]: Icon,
    [IconButton.name]: IconButton
  },

  data: function () {
    return {
      dataLoaded: false,
      showError: '',

      previewImage: null,
      imageDetails: [],
      imageLoaded: false,

      theme: ''
    };
  },

  methods: {
    getText,

    initSetup: async function () {
      try {
        await this.setup();
      } catch (err) {
        this.showError = getText('error_internalError');

        throw err;
      } finally {
        this.dataLoaded = true;
      }
    },

    setup: async function () {
      const storageId = new URL(window.location.href).searchParams.get('id');

      if (validateId(storageId)) {
        const image = await sendLargeMessage({
          message: {
            id: 'storageRequest',
            asyncResponse: true,
            saveReceipt: true,
            storageId
          },
          transferResponse: true,
          openConnection: this.$env.isSafari
        });

        if (image) {
          this.previewImage = image;

          document.title = getText('pageTitle', [
            image.imageFilename || getText('pageTitle_view'),
            getText('extensionName')
          ]);
        } else {
          this.showError = getText('error_sessionExpired');
        }
      } else {
        this.showError = getText('error_invalidPageUrl');
      }

      this.theme = await getAppTheme();
      document.addEventListener('themeChange', ev => {
        this.theme = ev.detail;
      });
    },

    onPreviewImageLoad: function () {
      this.setPreviewImageLoaded();
    },

    onPreviewImageError: function (ev) {
      const source = ev.target.previousElementSibling;
      source.srcset = ev.target.src;
      source.type = 'image/svg+xml';

      this.setPreviewImageLoaded();
    },

    setPreviewImageLoaded: function () {
      if (!this.imageLoaded) {
        this.setImageDetails();

        this.imageLoaded = true;
      }
    },

    setImageDetails: function () {
      const node = document.querySelector('.image-preview .image');

      let imageWidth, imageHeight;
      if (isPreviewImageValid(node)) {
        imageWidth = node.naturalWidth;
        imageHeight = node.naturalHeight;
      }

      this.imageDetails = getFormattedImageDetails({
        width: imageWidth,
        height: imageHeight,
        size: this.previewImage.imageSize,
        type: this.previewImage.imageType,
        iecSize: !this.$env.isWindows
      });
    },

    copyImageUrl: async function () {
      await navigator.clipboard.writeText(this.previewImage.imageUrl);
    }
  },

  created: function () {
    this.initSetup();
  }
};
</script>

<style lang="scss">
@use 'vueton/styles' as vueton;

@include vueton.theme-base;
@include vueton.transitions;

html,
body,
.vn-app,
.v-application__wrap {
  width: 100%;
  height: 100%;
}

.v-application__wrap {
  display: flex;
  justify-content: center;
  flex-direction: row;
}

.view-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  padding-top: 24px;
  padding-bottom: 24px;
  padding-left: 16px;
  padding-right: 16px;
  width: 100%;
  height: 100%;

  & .image-header {
    display: flex;
    flex-direction: column;
    row-gap: 4px;
    margin-bottom: 24px;
    padding-top: 16px;
    padding-bottom: 16px;
    padding-left: 24px;
    padding-right: 12px;
    box-sizing: border-box;
    max-width: min(960px, 100%);

    background-color: #fff;
    border-radius: 16px;

    @include vueton.md2-typography(subtitle1);
    font-size: 14px;

    & .image-url-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      column-gap: 16px;
      width: 100%;
      height: 32px;

      & .image-url-link {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        font-weight: 500;
        color: rgb(0, 102, 204);
        text-decoration: none;
      }

      & .image-url-link:hover,
      & .image-url-link:active {
        color: rgb(0, 82, 164);
      }
    }

    & .image-details-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      column-gap: 32px;
      width: 100%;
      height: 32px;

      & .image-name-text {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;

        display: none;
      }

      & .image-data-container {
        display: flex;
        align-items: center;
        column-gap: 8px;
        padding-right: 12px;
        width: 100%;

        & .image-dimension-text,
        & .image-size-text,
        & .image-type-text,
        & .image-data-separator {
          white-space: nowrap;
        }

        & .image-type-text {
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
    }
  }

  & .image-preview {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: calc(100% - 124px);

    & .image {
      object-fit: scale-down;
      max-width: 100%;
      max-height: 100%;
    }
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

.v-theme--light {
  & .v-application__wrap {
    background-color: var(--md-ref-palette-color5-1);
  }
}

.v-theme--dark {
  & .v-application__wrap {
    & .image-header {
      @include vueton.theme-prop(background-color, menu-surface);

      & .image-url-container {
        & .image-url-link {
          color: rgb(76, 164, 252);
        }

        & .image-url-link:hover,
        & .image-url-link:active {
          color: rgb(106, 180, 254);
        }
      }
    }
  }
}

/* tablets */
@media (min-width: 480px) {
  .image-name-text {
    display: initial !important;
  }

  .image-data-container {
    width: initial !important;
  }
}
</style>

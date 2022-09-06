<template>
  <div id="app" v-if="dataLoaded">
    <div class="view-content" v-if="previewImage && !showError">
      <div class="image-header">
        <div class="image-url-container" v-if="previewImage.imageUrl">
          <a
            class="image-url-link"
            :href="previewImage.imageUrl"
            :title="previewImage.imageFilename"
            >{{ previewImage.imageUrl }}</a
          >

          <v-icon-button
            src="/src/assets/icons/misc/copy.svg"
            :title="getText('buttonTooltip_copyImageUrl')"
            @click="copyImageUrl"
          ></v-icon-button>
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
          src="/src/assets/icons/misc/broken-image.svg"
          @error.once="onPreviewImageError"
          @load="onPreviewImageLoad"
          :alt="previewImage.imageFilename"
        />
      </picture>
    </div>

    <div class="error-content" v-if="showError">
      <img class="error-icon" src="/src/assets/icons/misc/error.svg" />
      <div class="error-text">{{ showError }}</div>
    </div>
  </div>
</template>

<script>
import {IconButton} from 'ext-components';

import {
  validateId,
  getFormattedImageDetails,
  isPreviewImageValid,
  sendLargeMessage
} from 'utils/app';
import {getText} from 'utils/common';

export default {
  components: {
    [IconButton.name]: IconButton
  },

  data: function () {
    return {
      dataLoaded: false,
      showError: '',

      previewImage: null,
      imageDetails: [],
      imageLoaded: false
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
  background-color: #f2f2f7;
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
    padding-right: 8px;
    box-sizing: border-box;
    max-width: min(960px, 100%);

    background-color: #fff;
    border-radius: 16px;

    @include mdc-typography(subtitle1);
    @include mdc-theme-prop(color, #252525);
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
        padding-right: 16px;
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

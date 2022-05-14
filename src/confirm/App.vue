<template>
  <v-dialog
    id="sbi-dialog-select"
    :title="getText('dialogTitle_imageConfirmation')"
    :cancel-text="getText('buttonText_cancel')"
    :show-dialog="showDialog"
    @cancel="onCancel"
  >
    <div class="preview-images">
      <div
        class="tile-container"
        tabindex="0"
        :data-index="index"
        @click="onSelection"
        @keyup.enter="onSelection"
        v-for="(img, index) in previewImages"
        :key="index"
      >
        <picture class="image-container">
          <source :srcset="img.image.imageDataUrl || img.image.imageUrl" />
          <img
            class="image"
            referrerpolicy="no-referrer"
            src="/src/assets/icons/misc/broken-image.svg"
            :data-index="index"
            @error.once="onPreviewImageError"
            @load="onPreviewImageLoad"
            :alt="img.image.imageFilename"
          />
        </picture>

        <div class="image-details" v-if="imagesLoaded">
          <div class="image-size">
            <div class="image-size-icons">
              <img
                class="image-size-icon"
                src="/src/assets/icons/misc/largest-image-width.svg"
                v-if="
                  largestImageDimension &&
                  img.imageWidth === largestImageWidth &&
                  img.imageHeight < largestImageHeight
                "
              />
              <img
                class="image-size-icon"
                src="/src/assets/icons/misc/largest-image-height.svg"
                v-if="
                  largestImageDimension &&
                  img.imageHeight === largestImageHeight &&
                  img.imageWidth < largestImageWidth
                "
              />
              <img
                class="image-size-icon"
                src="/src/assets/icons/misc/largest-image-dimension.svg"
                v-if="
                  largestImageDimension &&
                  img.imageDimension === largestImageDimension
                "
              />
            </div>

            <div class="image-size-text" v-if="img.imageWidth">
              {{ img.imageWidth }} × {{ img.imageHeight }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </v-dialog>
</template>

<script>
import {markRaw} from 'vue';
import {Dialog} from 'ext-components';

import {shareImage} from 'utils/app';
import {getText} from 'utils/common';

export default {
  components: {
    [Dialog.name]: Dialog
  },

  data: function () {
    return {
      showDialog: false,

      previewImages: [],

      imagesLoaded: false,
      largestImageWidth: 0,
      largestImageHeight: 0,
      largestImageDimension: 0
    };
  },

  rawData: {
    session: null
  },

  methods: {
    getText,

    onMessage: function (request, sender) {
      // Samsung Internet 13: extension messages are sometimes also dispatched
      // to the sender frame.
      if (sender && sender.url === document.URL) {
        return;
      }

      if (request.id === 'openView') {
        this.setup(request.session, request.images);
        this.openDialog();
      } else if (request.id === 'closeView') {
        this.closeDialog();
      }
    },

    onCancel: function () {
      this.closeDialog();
      browser.runtime.sendMessage({id: 'cancelView', view: 'confirm'});
    },

    onSelection: async function (ev) {
      this.closeDialog();

      const image = this.previewImages[ev.currentTarget.dataset.index].image;

      if (this.$options.rawData.session.sessionType === 'share') {
        await shareImage(image, {
          convert: this.$options.rawData.session.options.convertSharedImage
        });
        browser.runtime.sendMessage({id: 'cancelView', view: 'confirm'});
      } else {
        browser.runtime.sendMessage({
          id: 'imageConfirmationSubmit',
          image,
          session: this.$options.rawData.session
        });
      }
    },

    onPreviewImageLoad: function (ev) {
      const index = ev.target.dataset.index;

      const src = ev.target.currentSrc;
      if (src.startsWith('data') || src.startsWith('http')) {
        this.setPreviewImageDetails(index, {
          width: ev.target.naturalWidth,
          height: ev.target.naturalHeight
        });
      }

      this.setPreviewImageLoaded(index);
    },

    onPreviewImageError: function (ev) {
      const source = ev.target.previousElementSibling;
      source.srcset = ev.target.src;
      source.type = 'image/svg+xml';

      this.setPreviewImageLoaded(ev.target.dataset.index);
    },

    setPreviewImageDetails: function (index, {width = 0, height = 0} = {}) {
      const image = this.previewImages[index];
      image.imageDimension = width * height;
      image.imageWidth = width;
      image.imageHeight = height;

      this.setLargestImageDimension();
    },

    setPreviewImageLoaded: function (index) {
      const image = this.previewImages[index];
      image.imageLoaded = true;

      this.setImagesLoaded();
    },

    setLargestImageDimension: function () {
      for (const image of this.previewImages) {
        if (image.imageDimension > this.largestImageDimension) {
          this.largestImageDimension = image.imageDimension;
        }

        if (image.imageWidth > this.largestImageWidth) {
          this.largestImageWidth = image.imageWidth;
        }

        if (image.imageHeight > this.largestImageHeight) {
          this.largestImageHeight = image.imageHeight;
        }
      }
    },

    setImagesLoaded: function () {
      this.imagesLoaded = this.previewImages.every(image => image.imageLoaded);
    },

    addPreviewImages: function (images) {
      this.previewImages = images.map(image => ({
        image: markRaw(image),
        imageWidth: 0,
        imageHeight: 0,
        imageDimension: 0,
        imageLoaded: false
      }));
    },

    openDialog: function () {
      this.showDialog = true;
    },

    closeDialog: function () {
      this.showDialog = false;
    },

    setup: function (session, images) {
      this.imagesLoaded = false;
      this.largestImageWidth = 0;
      this.largestImageHeight = 0;
      this.largestImageDimension = 0;

      this.$options.rawData.session = session;
      this.addPreviewImages(images);
    },

    init: async function () {
      if (this.$env.isSafari) {
        const tab = await browser.tabs.getCurrent();
        this.contentMessagePort = browser.tabs.connect(tab.id, {frameId: 0});
        this.contentMessagePort.onMessage.addListener(this.onMessage);
      } else {
        browser.runtime.onMessage.addListener(this.onMessage);
        browser.runtime.sendMessage({
          id: 'routeMessage',
          setSenderFrameId: true,
          messageFrameId: 0,
          message: {id: 'saveFrameId'}
        });
      }
    }
  },

  mounted: function () {
    this.init();
  }
};
</script>

<style lang="scss">
@import '@material/button/mixins';
@import '@material/ripple/mixins';
@import '@material/theme/mixins';
@import '@material/typography/mixins';

body {
  @include mdc-typography-base;
  font-size: 100%;
}

.preview-images {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;

  max-width: calc(200px + 24px);
  @media (min-width: 520px) {
    max-width: calc(416px + 24px);
  }
  @media (min-width: 736px) {
    max-width: calc(632px + 24px);
  }
}

.tile-container {
  width: 200px;
  height: 186px;
  padding: 8px;
  box-sizing: border-box;
  position: relative;
  cursor: pointer;
  z-index: 1;
}

.tile-container:focus {
  outline: 0;
}

.tile-container::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  background-color: #bdc3c7;
  border-radius: 8px;
  transition: all 0.2s ease;
  transform: scale(0.96);
  opacity: 0;
}

.tile-container:focus::before,
.tile-container:hover::before {
  transform: scale(1);
  opacity: 0.26;
}

.image-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 138px;
}

.image {
  display: flex;
  object-fit: scale-down;
  max-width: 100%;
  max-height: 138px;
}

.image-details {
  margin-top: 8px;
}

.image-size {
  display: flex;
  align-items: center;
  column-gap: 8px;
  height: 24px;
}

.image-size-icons {
  display: flex;
  align-items: center;
  column-gap: 4px;
}

.image-size-icon {
  width: 16px;
  height: 16px;
  opacity: 0.8;
}

.image-size-text {
  @include mdc-typography(caption);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.mdc-dialog__surface {
  border-radius: 16px !important;
  min-width: initial !important;
  max-width: initial !important;
}

.mdc-dialog__title {
  @include mdc-theme-prop(color, #252525);
}

.mdc-dialog__button {
  @include mdc-button-ink-color(#4e5bb6);
  @include mdc-button-shape-radius(16px);

  & .mdc-button__ripple {
    @include mdc-states-base-color(#8188e9);
  }
}

.safari {
  & .mdc-dialog__button {
    -webkit-mask-image: -webkit-radial-gradient(white, black);
  }
}
</style>

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
            src="/src/assets/icons/misc/broken-image.svg"
            :data-index="index"
            @error.once="onPreviewImageError"
            @load="onPreviewImageLoad"
            :alt="img.image.imageFilename"
          />
        </picture>

        <div class="image-details" v-if="imagesLoaded">
          <template
            v-if="
              largestImageDimension &&
              (img.imageWidth === largestImageWidth ||
                img.imageHeight === largestImageHeight ||
                img.imageDimension === largestImageDimension)
            "
          >
            <div class="image-dimension-icon-container">
              <img
                class="image-dimension-icon"
                src="/src/assets/icons/misc/largest-image-width.svg"
                v-if="
                  img.imageWidth === largestImageWidth &&
                  img.imageHeight < largestImageHeight
                "
              />
              <img
                class="image-dimension-icon"
                src="/src/assets/icons/misc/largest-image-height.svg"
                v-if="
                  img.imageHeight === largestImageHeight &&
                  img.imageWidth < largestImageWidth
                "
              />
              <img
                class="image-dimension-icon"
                src="/src/assets/icons/misc/largest-image-dimension.svg"
                v-if="img.imageDimension === largestImageDimension"
              />
            </div>
            <div class="image-data-separator">•</div>
          </template>

          <template
            v-for="(detail, detailIndex) in filterImageDetails(
              img.imageDetails
            )"
            :key="detailIndex"
          >
            <div class="image-data-separator" v-if="detailIndex">•</div>
            <div :class="{[`image-${detail.kind}-text`]: true}">
              {{ detail.text }}
            </div>
          </template>
        </div>
      </div>
    </div>
  </v-dialog>
</template>

<script>
import {markRaw} from 'vue';
import {Dialog} from 'ext-components';

import {
  shareImage,
  getFormattedImageDetails,
  isPreviewImageValid,
  sendLargeMessage,
  processLargeMessage
} from 'utils/app';
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
      largestImageDimension: 0,
      largestImageIndex: null,

      minWidthViewport: false
    };
  },

  computed: {
    separatorClasses: function () {
      return {
        visible: this.searchAllEngines || this.hasScrollBar
      };
    },
    showSettings: function () {
      return (
        this.searchModeAction === 'url' ||
        (this.searchModeAction === 'browse' &&
          (this.browseEnabled || this.pasteEnabled))
      );
    }
  },

  rawData: {
    session: null
  },

  methods: {
    getText,

    processMessage: async function (request, sender) {
      if (request.id === 'openView') {
        this.setup(request.session, request.images);
        this.openDialog();
      } else if (request.id === 'closeView') {
        this.closeDialog();
      }
    },

    onMessage: function (request, sender) {
      processLargeMessage({
        request,
        sender,
        requestHandler: this.processMessage
      });
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
        await sendLargeMessage({
          message: {
            id: 'imageConfirmationSubmit',
            image,
            session: this.$options.rawData.session
          },
          openConnection: this.$env.isSafari
        });
      }
    },

    onPreviewImageLoad: function (ev) {
      this.setPreviewImageLoaded(ev.target.dataset.index);
    },

    onPreviewImageError: function (ev) {
      const source = ev.target.previousElementSibling;
      source.srcset = ev.target.src;
      source.type = 'image/svg+xml';

      this.setPreviewImageLoaded(ev.target.dataset.index);
    },

    setPreviewImageLoaded: function (index) {
      this.previewImages[index].imageLoaded = true;

      this.setImagesLoaded();
    },

    setImagesLoaded: function () {
      const imagesLoaded = this.previewImages.every(image => image.imageLoaded);

      if (imagesLoaded && !this.imagesLoaded) {
        this.setImageDetails();
        this.focusPreviewImage();

        this.imagesLoaded = true;
      }
    },

    setImageDetails: function () {
      for (const node of document.querySelectorAll('.preview-images .image')) {
        const index = node.dataset.index;
        const img = this.previewImages[index];

        if (isPreviewImageValid(node)) {
          img.imageWidth = node.naturalWidth;
          img.imageHeight = node.naturalHeight;
          img.imageDimension = img.imageWidth * img.imageHeight;

          if (img.imageDimension > this.largestImageDimension) {
            this.largestImageDimension = img.imageDimension;
            this.largestImageIndex = index;
          }

          if (img.imageWidth > this.largestImageWidth) {
            this.largestImageWidth = img.imageWidth;
          }

          if (img.imageHeight > this.largestImageHeight) {
            this.largestImageHeight = img.imageHeight;
          }
        }

        img.imageDetails = getFormattedImageDetails({
          width: img.imageWidth,
          height: img.imageHeight,
          size: img.image.imageSize,
          type: img.image.imageType,
          iecSize: !this.$env.isWindows
        });
      }
    },

    filterImageDetails: function (details) {
      return details.filter(item =>
        item.kind === 'size' && !this.minWidthViewport ? false : true
      );
    },

    addPreviewImages: function (images) {
      this.previewImages = images.map(image => ({
        image: markRaw(image),
        imageWidth: 0,
        imageHeight: 0,
        imageDimension: 0,
        imageLoaded: false,
        imageDetails: []
      }));
    },

    focusPreviewImage: function () {
      const node = document.querySelector(
        this.largestImageIndex !== null
          ? `.tile-container[data-index="${this.largestImageIndex}"]`
          : '.tile-container'
      );

      window.setTimeout(() => node.focus(), 300);
    },

    openDialog: function () {
      this.showDialog = true;
    },

    closeDialog: function () {
      this.showDialog = false;
    },

    initResizeObservers: function () {
      const mql = window.matchMedia('(min-width: 400px)');
      mql.addEventListener('change', this.setMinWidthViewport);
      this.setMinWidthViewport(mql);
    },

    setMinWidthViewport: function (ev) {
      this.minWidthViewport = ev.matches;
    },

    setup: function (session, images) {
      this.previewImages = [];

      this.imagesLoaded = false;
      this.largestImageWidth = 0;
      this.largestImageHeight = 0;
      this.largestImageDimension = 0;
      this.largestImageIndex = null;

      this.$options.rawData.session = session;

      this.$nextTick(() => {
        this.addPreviewImages(images);
      });
    },

    init: async function () {
      if (this.$env.isFirefox) {
        browser.runtime.onMessage.addListener(this.onMessage);
        browser.runtime.sendMessage({
          id: 'routeMessage',
          setSenderFrameId: true,
          messageFrameId: 0,
          message: {id: 'saveFrameId'}
        });
      } else {
        const tab = await browser.tabs.getCurrent();
        this.contentMessagePort = browser.tabs.connect(tab.id, {
          name: 'view',
          frameId: 0
        });
        this.contentMessagePort.onMessage.addListener(this.onMessage);
      }
    }
  },

  created: function () {
    this.initResizeObservers();
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
  margin: 0;
  @include mdc-typography-base;
  font-size: 100%;
}

.preview-images {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;

  max-width: 248px;
  @media (min-width: 400px) {
    max-width: 320px;
  }
  @media (min-width: 760px) {
    max-width: 680px;
  }
  @media (min-width: 1096px) {
    max-width: 1016px;
  }
}

.tile-container {
  width: 248px;
  height: 222px;
  @media (min-width: 400px) {
    width: 320px;
    height: 276px;
  }
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
  height: 174px;
  @media (min-width: 400px) {
    height: 228px;
  }
}

.image {
  display: flex;
  object-fit: scale-down;
  max-width: 100%;
  max-height: 174px;
  @media (min-width: 400px) {
    max-height: 228px;
  }
}

.image-details {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 6px;
  margin-top: 8px;
  max-width: 100%;
  height: 24px;
}

.image-dimension-icon-container {
  display: flex;
  align-items: center;
  column-gap: 3px;
}

.image-dimension-icon {
  width: 14px;
  height: 14px;
  opacity: 0.7;
}

.image-dimension-text,
.image-size-text,
.image-type-text,
.image-data-separator {
  @include mdc-typography(caption);
  white-space: nowrap;
}

.image-type-text {
  overflow: hidden;
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

.mdc-dialog__content {
  padding-bottom: 9px !important;
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

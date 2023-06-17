<template>
  <vn-app>
    <vn-dialog
      v-model="showDialog"
      content-class="confirmation-dialog__content"
      transition="scale-transition"
      scrollable
      persistent
    >
      <vn-card>
        <vn-card-title>{{
          getText('dialogTitle_imageConfirmation')
        }}</vn-card-title>

        <vn-divider :class="separatorClasses"></vn-divider>

        <vn-card-text tabindex="-1">
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
                <source
                  :srcset="img.image.imageDataUrl || img.image.imageUrl"
                />
                <img
                  class="image"
                  :src="`/src/assets/icons/misc/${
                    theme === 'dark' ? 'broken-image-dark' : 'broken-image'
                  }.svg`"
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
                    <vn-icon
                      class="image-dimension-icon"
                      src="/src/assets/icons/misc/swap-horiz.svg"
                      :title="getText('pageContent_widest_image')"
                      v-if="
                        img.imageWidth === largestImageWidth &&
                        img.imageHeight < largestImageHeight
                      "
                    ></vn-icon>
                    <vn-icon
                      class="image-dimension-icon"
                      src="/src/assets/icons/misc/swap-vert.svg"
                      :title="getText('pageContent_tallest_image')"
                      v-if="
                        img.imageHeight === largestImageHeight &&
                        img.imageWidth < largestImageWidth
                      "
                    ></vn-icon>
                    <vn-icon
                      class="image-dimension-icon"
                      src="/src/assets/icons/misc/open-with.svg"
                      :title="getText('pageContent_largest_image')"
                      v-if="img.imageDimension === largestImageDimension"
                    ></vn-icon>
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
        </vn-card-text>

        <vn-divider :class="separatorClasses"></vn-divider>

        <vn-card-actions>
          <vn-button @click="onCancel" variant="tonal">
            {{ getText('buttonLabel_cancel') }}
          </vn-button>
        </vn-card-actions>
      </vn-card>
    </vn-dialog>
  </vn-app>
</template>

<script>
import {markRaw} from 'vue';
import {
  App,
  Button,
  Card,
  CardActions,
  CardText,
  CardTitle,
  Dialog,
  Divider,
  Icon
} from 'vueton';

import {
  shareImage,
  getFormattedImageDetails,
  isPreviewImageValid,
  sendLargeMessage,
  processLargeMessage,
  getAppTheme
} from 'utils/app';
import {getText} from 'utils/common';

export default {
  components: {
    [App.name]: App,
    [Button.name]: Button,
    [Card.name]: Card,
    [CardActions.name]: CardActions,
    [CardText.name]: CardText,
    [CardTitle.name]: CardTitle,
    [Dialog.name]: Dialog,
    [Divider.name]: Divider,
    [Icon.name]: Icon
  },

  data: function () {
    return {
      showDialog: false,
      hasScrollBar: false,

      previewImages: [],

      imagesLoaded: false,
      largestImageWidth: 0,
      largestImageHeight: 0,
      largestImageDimension: 0,
      largestImageIndex: null,

      minWidthViewport: false,

      theme: ''
    };
  },

  computed: {
    separatorClasses: function () {
      return {
        visible: this.hasScrollBar
      };
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

      const observer = new ResizeObserver(this.configureScrollBar);
      const content = document.querySelector('.preview-images');
      observer.observe(content);
      observer.observe(content.parentNode);

      this.configureScrollBar();
    },

    setMinWidthViewport: function (ev) {
      this.minWidthViewport = ev.matches;
    },

    configureScrollBar: function () {
      const content = document.querySelector('.preview-images').parentNode;

      this.hasScrollBar = content.scrollHeight > content.clientHeight;
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

      this.theme = await getAppTheme();
      document.addEventListener('themeChange', ev => {
        this.theme = ev.detail;
      });

      window.addEventListener(
        'keydown',
        ev => {
          if (ev.key === 'Escape') {
            ev.preventDefault();
            ev.stopImmediatePropagation();

            this.onCancel();
          }
        },
        {capture: true, passive: false}
      );

      this.initResizeObservers();
    }
  },

  mounted: function () {
    this.init();
  }
};
</script>

<style lang="scss">
@use 'vueton/styles' as vueton;

@include vueton.theme-base;
@include vueton.transitions;

.v-application {
  background: transparent !important;
}

.vn-dialog {
  & .confirmation-dialog__content {
    transform-origin: center center !important;

    width: initial !important;
    max-width: initial !important;
    max-height: calc(100% - 32px) !important;

    & .vn-card {
      @include vueton.theme-prop(background-color, menu-surface);

      & .vn-divider {
        opacity: 0;
        transition: none;
      }

      & .vn-card-title {
        padding-bottom: 16px !important;
      }

      & .vn-card-text {
        padding-top: 8px !important;
        padding-bottom: 8px !important;
      }

      & .vn-card-actions {
        padding-top: 16px !important;
        padding-bottom: 16px !important;
        padding-left: 16px !important;
        padding-right: 16px !important;

        & .vn-button {
          @include vueton.theme-prop(color, primary);
        }
      }
    }
  }
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
  height: 226px;
  @media (min-width: 400px) {
    width: 320px;
    height: 280px;
  }
  padding: 16px;
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
  @include vueton.theme-prop(background-color, surface-variant);
  border-radius: 16px;
  transition: all 0.2s ease;
  transform: scale(0.96);
  opacity: 0;
}

.tile-container:focus::before,
.tile-container:hover::before {
  transform: scale(1);
  opacity: 1;
}

.image-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 162px;
  @media (min-width: 400px) {
    height: 216px;
  }
}

.image {
  display: flex;
  object-fit: scale-down;
  max-width: 100%;
  max-height: 162px;
  @media (min-width: 400px) {
    max-height: 216px;
  }
}

.image-details {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 6px;
  margin-top: 12px;
  max-width: 100%;
  height: 24px;
}

.image-dimension-icon-container {
  display: flex;
  align-items: center;
  column-gap: 3px;
}

.image-dimension-icon {
  width: 14px !important;
  height: 14px !important;
}

.image-dimension-text,
.image-size-text,
.image-type-text,
.image-data-separator {
  @include vueton.md2-typography(caption);
  white-space: nowrap;
}

.image-type-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.visible {
  opacity: 1 !important;
}
</style>

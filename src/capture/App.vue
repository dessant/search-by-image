<template>
  <vn-app :class="appClasses">
    <div ref="canvasWrap" class="canvas-wrap">
      <canvas id="canvas"></canvas>
    </div>
    <vn-snackbar v-model="openSnackbar" :timeout="-1">
      <vn-icon-button
        src="/src/assets/icons/misc/close.svg"
        :title="getText('buttonTooltip_close')"
        @click="onCancel"
      ></vn-icon-button>

      {{ getText('snackbarMessage_imageCapture') }}

      <template v-slot:actions>
        <vn-button class="capture-button" @click="onCapture" variant="tonal">
          {{ getText('buttonLabel_search') }}
        </vn-button>
      </template>
    </vn-snackbar>
  </vn-app>
</template>

<script>
import Cropper from 'cropperjs';
import {App, Button, IconButton, Snackbar} from 'vueton';

import {getText} from 'utils/common';

export default {
  components: {
    [App.name]: App,
    [Button.name]: Button,
    [IconButton.name]: IconButton,
    [Snackbar.name]: Snackbar
  },

  data: function () {
    return {
      canvasHidden: false,
      openSnackbar: false
    };
  },

  computed: {
    appClasses: function () {
      return {
        'canvas-hidden': this.canvasHidden
      };
    }
  },

  rawData: {
    session: null
  },

  methods: {
    getText,

    setup: async function () {
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
    },

    onMessage: function (request, sender) {
      // Samsung Internet 13: extension messages are sometimes also dispatched
      // to the sender frame.
      if (sender && sender.url === document.URL) {
        return;
      }

      if (request.id === 'openView') {
        this.$options.rawData.session = request.session;
        this.showCapture();
      } else if (request.id === 'closeView') {
        this.hideCapture();
      }
    },

    onCancel: function () {
      this.hideCapture();
      browser.runtime.sendMessage({id: 'cancelView', view: 'capture'});
    },

    onCapture: function () {
      const area = this.getCaptureArea();

      if (!area.width) {
        browser.runtime.sendMessage({
          id: 'notification',
          messageId: 'error_invalidCaptureArea'
        });
        return;
      }

      this.$refs.canvasWrap.addEventListener(
        'transitionend',
        () => {
          browser.runtime.sendMessage({
            id: 'imageCaptureSubmit',
            session: this.$options.rawData.session,
            area
          });
        },
        {capture: true, once: true}
      );

      this.hideCapture();
    },

    getCaptureArea: function () {
      const area = this.cropper.getCropBoxData();
      // include crop area margins
      area.top += 4;
      area.left += 4;

      return area;
    },

    showCapture: function () {
      this.showSnackbar();

      this.canvasHidden = false;
      if (!this.cropper) {
        this.cropper = new Cropper(document.getElementById('canvas'), {
          checkCrossOrigin: false,
          checkOrientation: false,
          background: false,
          modal: false,
          guides: false,
          center: false,
          highlight: false,
          autoCrop: false,
          movable: false,
          rotatable: false,
          scalable: false,
          zoomable: false,
          toggleDragModeOnDblclick: false,
          minCropBoxWidth: 1,
          minCropBoxHeight: 1
        });
      }
    },

    hideCapture: function () {
      this.hideSnackbar();

      this.canvasHidden = true;
      if (this.cropper) {
        this.cropper.clear();
      }
    },

    showSnackbar: function () {
      this.openSnackbar = true;
    },

    hideSnackbar: function () {
      this.openSnackbar = false;
    }
  },

  mounted: function () {
    this.setup();
  }
};
</script>

<style lang="scss">
@use 'vueton/styles' as vueton;
@use 'cropperjs/dist/cropper';

@include vueton.theme-base;
@include vueton.transitions;

html,
body,
.vn-app,
.v-application__wrap,
#canvas {
  width: 100%;
  height: 100%;
}

body {
  overflow: hidden;
}

.v-application {
  background: transparent !important;
}

.vn-snackbar {
  & .v-snackbar__wrapper {
    margin-bottom: calc(8px + env(safe-area-inset-bottom, 0px)) !important;
    background-color: var(--md-ref-palette-primary30) !important;

    & .v-snackbar__content {
      font-size: 16px;
      font-weight: 500;

      display: flex;
      align-items: center;
      gap: 12px;

      padding-top: 0px;
      padding-bottom: 0px;
      padding-left: 4px;
      padding-right: 16px;

      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    & .vn-icon-button {
      @include vueton.theme-prop(color, inverse-primary);

      & .vn-icon {
        @include vueton.theme-prop(background-color, inverse-on-surface);
      }

      & .vn-icon-button__state {
        @include vueton.theme-prop(background-color, inverse-primary);
      }
    }

    & .capture-button {
      padding-left: 24px;
      padding-right: 24px;

      & .v-btn__content {
        font-size: 16px !important;
        @include vueton.theme-prop(color, inverse-on-surface);
      }

      @include vueton.theme-prop(color, inverse-primary);
    }
  }
}

.canvas-wrap {
  margin-top: 4px;
  margin-left: 4px;
  margin-right: 4px;
  width: calc(100% - 4px - 4px);
  height: calc(100% - 4px - 64px - env(safe-area-inset-bottom, 0px));
}

.canvas-hidden .canvas-wrap {
  transition: opacity 0.001s;
  opacity: 0;
}

.cropper-modal,
.cropper-view-box,
.cropper-line {
  display: none;
}

.cropper-crop-box::before {
  content: ' ';
  position: absolute;
  width: 100%;
  height: 100%;
  box-shadow: 0 0 0 20000px rgba(0, 0, 0, 0.4);
}

.cropper-point {
  background-color: transparent;

  &.point-e,
  &.point-w {
    top: 0;
    margin-top: 16px;
    width: 32px;
    height: calc(100% - 32px);
    cursor: ew-resize;
  }

  &.point-n,
  &.point-s {
    left: 0;
    margin-left: 16px;
    width: calc(100% - 32px);
    height: 32px;
    cursor: ns-resize;
  }

  &.point-e {
    right: -16px;
  }

  &.point-n {
    top: -16px;
  }

  &.point-w {
    left: -16px;
  }

  &.point-s {
    bottom: -16px;
  }

  &.point-ne,
  &.point-nw,
  &.point-sw,
  &.point-se {
    position: absolute;
    width: 32px;
    height: 32px;

    user-select: none;
    touch-action: none;
    opacity: 1;

    &::before {
      all: initial;
    }

    &::after {
      position: absolute;
      box-sizing: border-box;
      width: 16px;
      height: 16px;
      content: '';
      color: var(--md-ref-palette-primary50);
    }
  }

  &.point-ne {
    top: -16px;
    right: -16px;
    cursor: nesw-resize;

    &::after {
      top: 14px;
      right: 14px;
      border-top: 4px solid;
      border-right: 4px solid;
      border-top-right-radius: 6px;
    }
  }

  &.point-nw {
    top: -16px;
    left: -16px;
    cursor: nwse-resize;

    &::after {
      top: 14px;
      left: 14px;
      border-top: 4px solid;
      border-left: 4px solid;
      border-top-left-radius: 6px;
    }
  }

  &.point-sw {
    bottom: -16px;
    left: -16px;
    cursor: nesw-resize;

    &::after {
      bottom: 14px;
      left: 14px;
      border-bottom: 4px solid;
      border-left: 4px solid;
      border-bottom-left-radius: 6px;
    }
  }

  &.point-se {
    right: -16px;
    bottom: -16px;
    cursor: nwse-resize;

    &::after {
      right: 14px;
      bottom: 14px;
      border-right: 4px solid;
      border-bottom: 4px solid;
      border-bottom-right-radius: 6px;
    }
  }
}

.v-theme--dark {
  &.vn-snackbar {
    & .v-snackbar__wrapper {
      background-color: var(--md-ref-palette-primary80) !important;
    }
  }

  & .cropper-point {
    &.point-ne,
    &.point-nw,
    &.point-sw,
    &.point-se {
      &::after {
        color: var(--md-ref-palette-primary60);
      }
    }
  }
}

/* tablets */
@media (min-width: 480px) {
  html {
    & .vn-snackbar {
      & .v-snackbar__wrapper {
        min-width: 360px;
      }
    }
  }
}
</style>

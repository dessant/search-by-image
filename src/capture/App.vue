<template>
  <div id="app" :class="appClasses">
    <div ref="canvasWrap" class="canvas-wrap">
      <canvas id="canvas"></canvas>
    </div>
    <div ref="snackbar" class="mdc-snackbar">
      <div class="mdc-snackbar__surface">
        <div class="mdc-snackbar__label">
          {{ getText('snackbarMessage_imageCapture') }}
        </div>
        <div class="mdc-snackbar__actions">
          <v-button
            class="capture-button"
            :ripple="false"
            :label="getText('buttonText_search')"
            @click="onCapture"
          >
          </v-button>

          <v-icon-button
            class="cancel-button"
            :ripple="false"
            src="/src/assets/icons/misc/close-alt.svg"
            @click="onCancel"
          >
          </v-icon-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Cropper from 'cropperjs';
import {MDCSnackbar} from '@material/snackbar';
import {Button, IconButton} from 'ext-components';

import {getText} from 'utils/common';

export default {
  components: {
    [Button.name]: Button,
    [IconButton.name]: IconButton
  },

  data: function () {
    return {
      canvasHidden: false
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
      const area = this.cropper.getCropBoxData();

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

    showCapture: function () {
      this.snackbar.open();

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
      this.snackbar.close();

      this.canvasHidden = true;
      if (this.cropper) {
        this.cropper.clear();
      }
    }
  },

  mounted: async function () {
    this.snackbar = new MDCSnackbar(this.$refs.snackbar);
    this.snackbar.foundation_.autoDismissTimeoutMs_ = 31556952000; // 1 year
    this.snackbar.closeOnEscape = false;

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
};
</script>

<style lang="scss">
@import '@material/snackbar/mdc-snackbar';
@import '@material/button/mixins';
@import '@material/icon-button/mixins';
@import '@material/ripple/mixins';
@import '@material/typography/mixins';
@import '~cropperjs/dist/cropper';

html,
body,
#app,
#canvas {
  width: 100%;
  height: 100%;
}

body {
  margin: 0;
  @include mdc-typography-base;
  font-size: 100%;
  overflow: hidden;
}

.canvas-wrap {
  width: 100%;
  height: calc(100% - calc(64px + env(safe-area-inset-bottom, 0px)));
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
      color: #8188e9;
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
      border-top-right-radius: 4px;
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
      border-top-left-radius: 4px;
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
      border-bottom-left-radius: 4px;
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
      border-bottom-right-radius: 4px;
    }
  }
}

.mdc-snackbar {
  @include mdc-snackbar-fill-color(#312a65);
  @include mdc-snackbar-shape-radius(8px);
  padding-bottom: env(safe-area-inset-bottom, 0px) !important;
}

.mdc-snackbar__surface {
  box-shadow: 0px 3px 5px -1px rgba(0, 0, 0, 0.12),
    0px 6px 10px 0px rgba(0, 0, 0, 0.08), 0px 1px 12px 0px rgba(0, 0, 0, 0.06);
}

.mdc-snackbar__label {
  font-size: 17px;
  font-weight: 500;
}

.capture-button {
  @include mdc-button-ink-color(#a7aae1);
  @include mdc-button-shape-radius(16px);
  font-size: 17px;

  & .mdc-button__ripple {
    @include mdc-states-base-color(#ffffff);
  }
}

.cancel-button {
  @include mdc-icon-button-icon-size(22px, 22px, 7px);
  @include mdc-icon-button-ink-color(rgba(255, 255, 255, 0.87));
  margin-left: 8px;
}

.safari {
  & .capture-button {
    -webkit-mask-image: -webkit-radial-gradient(white, black);
  }
}

/* tablets */
@media (min-width: 480px) {
  .mdc-snackbar__surface {
    min-width: 440px !important;
  }
}
</style>

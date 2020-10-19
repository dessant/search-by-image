<template>
  <div id="app">
    <div class="canvas-wrap">
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
            src="/src/icons/misc/close.svg"
            @click="onCancel"
          >
          </v-icon-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import browser from 'webextension-polyfill';
import Cropper from 'cropperjs';
import {MDCSnackbar} from '@material/snackbar';
import {Button, IconButton} from 'ext-components';

import {getText} from 'utils/common';

export default {
  components: {
    [Button.name]: Button,
    [IconButton.name]: IconButton
  },

  methods: {
    getText,

    onMessage: function (request, sender) {
      if (request.id === 'imageCaptureOpen') {
        this.engine = request.engine;
        this.showCapture();

        return;
      }
      if (request.id === 'imageCaptureClose') {
        this.hideCapture();
        return;
      }
    },

    onCancel: function () {
      this.hideCapture();
      browser.runtime.sendMessage({id: 'imageCaptureCancel'});
    },

    onCapture: function (e) {
      const area = this.cropper.getCropBoxData();

      if (!area.width) {
        browser.runtime.sendMessage({
          id: 'notification',
          messageId: 'error_invalidCaptureArea',
          type: 'captureError'
        });
        return;
      }

      area.left += 3;
      area.top += 3;
      area.width -= 6;
      area.height -= 6;

      this.hideCapture();
      browser.runtime.sendMessage({
        id: 'imageCaptureSubmit',
        engine: this.engine,
        area
      });
    },

    showCapture: function () {
      this.snackbar.open();
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
      if (this.cropper) {
        this.cropper.clear();
      }
    }
  },

  mounted: function () {
    this.snackbar = new MDCSnackbar(this.$refs.snackbar);
    this.snackbar.foundation_.autoDismissTimeoutMs_ = 31556952000; // 1 year
    this.snackbar.closeOnEscape = false;

    browser.runtime.onMessage.addListener(this.onMessage);
    browser.runtime.sendMessage({id: 'captureFrameId'});
  }
};
</script>

<style lang="scss">
$mdc-theme-primary: #1abc9c;

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
  height: calc(100% - 64px);
}

.cropper-point,
.cropper-point.point-se:before,
.cropper-line {
  background-color: #1abc9c;
}

.cropper-line {
  opacity: 0.3;
}

.cropper-view-box {
  outline-color: transparent;
}

.cropper-modal {
  background-color: transparent;
}

.cropper-point.point-se {
  height: 5px;
  width: 5px;
}

.cropper-crop-box::before {
  content: ' ';
  position: absolute;
  top: -3px;
  left: -3px;
  width: calc(100% + 6px);
  height: calc(100% + 6px);
  box-shadow: 0 0 0 20000px rgba(0, 0, 0, 0.4);
}

.cancel-button {
  @include mdc-icon-button-icon-size(18px, 18px, 9px);
  @include mdc-icon-button-ink-color(rgba(255, 255, 255, 0.87));
  margin-left: 8px;
}

/* tablets */
@media (min-width: 480px) {
  .mdc-snackbar__surface {
    min-width: 440px !important;
  }
}

.firefox-android {
  & .cropper-point,
  & .cropper-point.point-se:before,
  & .cropper-line {
    background-color: #312a65;
  }

  & .mdc-snackbar {
    @include mdc-snackbar-fill-color(#312a65);
    @include mdc-snackbar-shape-radius(8px);
  }

  & .mdc-snackbar__label {
    font-size: 18px;
    font-weight: 500;
  }

  & .capture-button {
    @include mdc-button-ink-color(#ffffff);
    font-size: 17px;

    & .mdc-button__ripple {
      @include mdc-states-base-color(#ffffff);
    }
  }

  & .cancel-button {
    @include mdc-icon-button-icon-size(24px, 24px, 6px);
  }
}
</style>

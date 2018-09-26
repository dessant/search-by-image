<template>
<div id="app">
  <div class="canvas-wrap">
    <canvas id="canvas"></canvas>
  </div>
  <div ref="snackbar" class="mdc-snackbar" :class="classes"
       aria-live="assertive"
       aria-atomic="true"
       aria-hidden="showSnackbar">
    <div class="mdc-snackbar__text">
      {{ getText('snackbarMessage_imageCapture') }}
    </div>
    <div class="mdc-snackbar__action-wrapper">
      <button type="button" class="mdc-snackbar__action-button"
          @click="onCancel">
        {{ getText('buttonText_cancel') }}
      </button>
      <v-button class="capture-button"
          :raised="true"
          @click="onCapture">
        {{ getText('buttonText_search') }}
      </v-button>
    </div>
  </div>
</div>
</template>

<script>
import browser from 'webextension-polyfill';
import Cropper from 'cropperjs';
import {Button} from 'ext-components';

import {getText} from 'utils/common';

export default {
  components: {
    [Button.name]: Button
  },

  data: function() {
    return {
      showSnackbar: false,
      cropper: null
    };
  },

  computed: {
    classes: function() {
      return {
        'mdc-snackbar--active': this.showSnackbar
      };
    }
  },

  methods: {
    getText,

    onMessage: function(request, sender, sendResponse) {
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

    onCancel: function() {
      this.hideCapture();
      browser.runtime.sendMessage({id: 'imageCaptureCancel'});
    },

    onCapture: function(e) {
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

    showCapture: function() {
      this.showSnackbar = true;
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

    hideCapture: function() {
      this.showSnackbar = false;
      if (this.cropper) {
        this.cropper.clear();
      }
    }
  },

  mounted: function() {
    browser.runtime.onMessage.addListener(this.onMessage);
    browser.runtime.sendMessage({id: 'captureFrameId'});
  }
};
</script>

<style lang="scss">
$mdc-theme-primary: #1abc9c;

@import '@material/snackbar/mdc-snackbar';
@import '@material/theme/mixins';
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
  height: calc(100% - 80px);
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

.mdc-snackbar {
  height: 80px !important;
  padding-top: 8px;
  padding-bottom: 8px;
}

.mdc-snackbar__action-wrapper {
  white-space: nowrap;
}

.mdc-snackbar__action-button {
  @include mdc-theme-prop(color, primary);
}

.capture-button {
  color: #fff !important;
  margin-left: 24px;
}

/* phones */
@media (min-width: 490px) {
  .mdc-snackbar {
    height: 64px !important;
  }

  .canvas-wrap {
    height: calc(100% - 64px);
  }
}

/* tablets */
@media (min-width: 600px) {
  .mdc-snackbar {
    min-width: 490px !important;
  }
}
</style>

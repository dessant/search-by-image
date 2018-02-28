<template>
<div id="app">
  <div ref="snackbar" class="mdc-snackbar" :class="classes"
       aria-live="assertive"
       aria-atomic="true"
       aria-hidden="showSelect">
    <div class="mdc-snackbar__text">
      {{ getText('snackbarMessage_imageSelection') }}
    </div>
    <div class="mdc-snackbar__action-wrapper">
      <button type="button" class="mdc-snackbar__action-button"
          @click="onCancel">
        {{ getText('buttonText_cancel') }}
      </button>
    </div>
  </div>
</div>
</template>

<script>
import browser from 'webextension-polyfill';
import {MDCSnackbar} from '@material/snackbar';

import {getText} from 'utils/common';

export default {
  data: function() {
    return {
      showSelect: false
    };
  },

  computed: {
    classes: function() {
      return {
        'mdc-snackbar--active': this.showSelect
      };
    }
  },

  methods: {
    getText: getText,

    onMessage: function(request, sender, sendResponse) {
      if (request.id === 'imageSelectionOpen') {
        this.showSelect = true;
        return;
      }
      if (request.id === 'imageSelectionClose') {
        this.showSelect = false;
        return;
      }
    },

    onCancel: function() {
      this.showSelect = false;
      browser.runtime.sendMessage({id: 'imageSelectionCancel'});
    }
  },

  created: function() {
    browser.runtime.onMessage.addListener(this.onMessage);
    browser.runtime.sendMessage({id: 'selectFrameId'});
  }
};
</script>

<style lang="scss">
$mdc-theme-primary: #1abc9c;

@import '@material/snackbar/mdc-snackbar';
@import '@material/theme/mixins';
@import '@material/typography/mixins';

html,
body {
  width: 100%;
  height: 100%;
}

body {
  margin: 0;
  @include mdc-typography-base;
  font-size: 100%;
}

#app {
  height: 100%;
}

.mdc-snackbar__action-button {
  @include mdc-theme-prop(color, primary);
}

/* xs phones */
@media (max-width: 372px) {
  .mdc-snackbar {
    height: 80px !important;
  }
}

/* tablets */
@media (min-width: 601px) {
  .mdc-snackbar {
    min-width: 372px !important;
  }
}
</style>

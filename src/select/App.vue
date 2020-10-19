<template>
  <div id="app">
    <div ref="snackbar" class="mdc-snackbar">
      <div class="mdc-snackbar__surface">
        <div class="mdc-snackbar__label">
          {{ getText('snackbarMessage_imageSelection') }}
        </div>
        <div class="mdc-snackbar__actions">
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
import {MDCSnackbar} from '@material/snackbar';
import {IconButton} from 'ext-components';

import {getText} from 'utils/common';

export default {
  components: {
    [IconButton.name]: IconButton
  },

  methods: {
    getText,

    onMessage: function (request, sender) {
      if (request.id === 'imageSelectionOpen') {
        this.snackbar.open();
        return;
      }
      if (request.id === 'imageSelectionClose') {
        this.snackbar.close();
        return;
      }
    },

    onCancel: function () {
      this.snackbar.close();
      browser.runtime.sendMessage({id: 'imageSelectionCancel'});
    }
  },

  mounted: function () {
    this.snackbar = new MDCSnackbar(this.$refs.snackbar);
    this.snackbar.foundation_.autoDismissTimeoutMs_ = 31556952000; // 1 year
    this.snackbar.closeOnEscape = false;

    browser.runtime.onMessage.addListener(this.onMessage);
    browser.runtime.sendMessage({id: 'selectFrameId'});
  }
};
</script>

<style lang="scss">
$mdc-theme-primary: #1abc9c;

@import '@material/snackbar/mdc-snackbar';
@import '@material/icon-button/mixins';
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

.cancel-button {
  @include mdc-icon-button-icon-size(18px, 18px, 9px);
  @include mdc-icon-button-ink-color(rgba(255, 255, 255, 0.87));
}

/* tablets */
@media (min-width: 480px) {
  .mdc-snackbar__surface {
    min-width: 400px !important;
  }
}

.firefox-android {
  & .mdc-snackbar {
    @include mdc-snackbar-fill-color(#312a65);
    @include mdc-snackbar-shape-radius(8px);
  }

  & .mdc-snackbar__label {
    font-size: 18px;
    font-weight: 500;
  }

  & .cancel-button {
    @include mdc-icon-button-icon-size(24px, 24px, 6px);
  }
}
</style>

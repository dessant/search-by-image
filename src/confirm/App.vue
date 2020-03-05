<template>
  <v-dialog
    id="sbi-dialog-select"
    :title="getText('dialogTitle_imageConfirmation')"
    :cancel-text="getText('buttonText_cancel')"
    :show-dialog="showDialog"
    @cancel="onCancel"
  >
    <div class="mdc-grid-list">
      <ul class="mdc-grid-list__tiles">
        <li class="mdc-grid-tile" v-for="(img, index) in images">
          <div class="mdc-grid-tile__primary">
            <div
              class="mdc-grid-tile__primary-content tile-container"
              tabindex="0"
              :data-index="index"
              @click="onSelection"
              @keyup.enter="onSelection"
            >
              <img
                class="tile"
                referrerpolicy="no-referrer"
                :src="img.data || img.url"
              />
            </div>
          </div>
        </li>
      </ul>
    </div>
  </v-dialog>
</template>

<script>
import browser from 'webextension-polyfill';
import {Dialog} from 'ext-components';

import {getText} from 'utils/common';

export default {
  components: {
    [Dialog.name]: Dialog
  },

  data: function() {
    return {
      showDialog: false,
      images: [],
      engine: ''
    };
  },

  methods: {
    getText,

    onMessage: function(request, sender, sendResponse) {
      if (request.id === 'imageConfirmationOpen') {
        this.images = request.images;
        this.engine = request.engine;
        this.showDialog = true;
      }
      if (request.id === 'imageConfirmationClose') {
        this.showDialog = false;
      }
    },

    onCancel: function() {
      this.showDialog = false;
      browser.runtime.sendMessage({id: 'imageConfirmationCancel'});
    },

    onSelection: function(e) {
      this.showDialog = false;
      browser.runtime.sendMessage({
        id: 'imageConfirmationSubmit',
        img: Object.assign({}, this.images[e.target.dataset.index]),
        engine: this.engine
      });
    }
  },

  created: async function() {
    browser.runtime.onMessage.addListener(this.onMessage);
    browser.runtime.sendMessage({id: 'confirmFrameId'});
  }
};
</script>

<style lang="scss">
$mdc-theme-primary: #1abc9c;

@import '@material/grid-list/mdc-grid-list';
@import '@material/button/mixins';
@import '@material/ripple/mixins';
@import '@material/theme/mixins';
@import '@material/typography/mixins';

body {
  @include mdc-typography-base;
  font-size: 100%;
}

.tile-container {
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

.tile-container:focus {
  outline: 0;
}

.tile-container::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  background-color: #bdc3c7;
  transition: all 0.3s ease;
}

.tile-container:focus::after,
.tile-container:hover::after {
  opacity: 0.16;
}

.tile {
  max-width: 94%;
  max-height: 94%;
  object-fit: scale-down;
}

@media (min-width: 722px) {
  .mdc-dialog__surface {
    max-width: 660px !important;
  }

  .mdc-dialog--scrollable .mdc-dialog__surface {
    max-width: 690px !important;
  }
}

.fenix {
  & .mdc-dialog__title {
    @include mdc-theme-prop(color, #20123a);
  }

  & .mdc-dialog__button {
    @include mdc-button-ink-color(#20123a);

    & .mdc-button__ripple {
      @include mdc-states-base-color(#312a65);
    }
  }
}
</style>

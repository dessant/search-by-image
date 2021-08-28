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
        <li class="mdc-grid-tile" v-for="(img, index) in images" :key="index">
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
                :src="img.imageDataUrl || img.imageUrl"
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
import {targetEnv} from 'utils/config';

export default {
  components: {
    [Dialog.name]: Dialog
  },

  data: function () {
    return {
      showDialog: false,
      contentMessagePort: null,

      session: null,
      images: []
    };
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
        this.session = request.session;
        this.images = request.images;
        this.showDialog = true;
      } else if (request.id === 'closeView') {
        this.showDialog = false;
      }
    },

    onCancel: function () {
      this.showDialog = false;
      browser.runtime.sendMessage({id: 'cancelView', view: 'confirm'});
    },

    onSelection: function (ev) {
      this.showDialog = false;
      browser.runtime.sendMessage({
        id: 'imageConfirmationSubmit',
        image: Object.assign({}, this.images[ev.target.dataset.index]),
        session: this.session
      });
    }
  },

  mounted: async function () {
    if (targetEnv === 'safari') {
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

.firefox.android {
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

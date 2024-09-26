<template>
  <vn-app>
    <vn-snackbar v-model="openSnackbar" :timeout="-1">
      <vn-icon-button
        src="/src/assets/icons/misc/close.svg"
        :title="getText('buttonTooltip_close')"
        @click="onCancel"
      ></vn-icon-button>

      {{ getText('snackbarMessage_imageSelection') }}
    </vn-snackbar>
  </vn-app>
</template>

<script>
import {App, IconButton, Snackbar} from 'vueton';

import {validateId} from 'utils/app';
import {getText} from 'utils/common';

export default {
  components: {
    [App.name]: App,
    [IconButton.name]: IconButton,
    [Snackbar.name]: Snackbar
  },

  data: function () {
    return {
      openSnackbar: false
    };
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
      } else if (this.$env.isSafari) {
        // Safari 18: extension pages loaded in iframes can no longer connect
        // to the content script of the top-level document with tabs.connect,
        // event handlers registered with runtime.onConnect
        // in the content script are no longer called.

        // Messages sent from the background script using tabs.sendMessage
        // are still not received by the extension page in Safari, so we must
        // notify the extension page from the content script using
        // frame.contentWindow.postMessage to retrieve its message
        // from the background script.

        window.addEventListener('message', async ev => {
          const messageId = ev.data;

          if (validateId(messageId)) {
            const message = await browser.runtime.sendMessage({
              id: 'storageRequest',
              asyncResponse: true,
              saveReceipt: true,
              storageId: messageId
            });

            if (message) {
              this.onMessage(message);
            }
          }
        });

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
        this.showSnackbar();
      } else if (request.id === 'closeView') {
        this.hideSnackbar();
      } else if (request.id === 'imageSelectionSubmit') {
        this.hideSnackbar();

        const session = this.$options.rawData.session;
        session.sourceFrameId = request.senderFrameId;

        browser.runtime.sendMessage({id: request.id, session});
      }
    },

    onCancel: function () {
      this.hideSnackbar();
      browser.runtime.sendMessage({id: 'cancelView', view: 'select'});
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

@include vueton.theme-base;
@include vueton.transitions;

html,
body,
.vn-app,
.v-application__wrap {
  width: 100%;
  height: 100%;
}

.v-application {
  background: transparent !important;
}

.vn-snackbar {
  & .v-snackbar__wrapper {
    min-width: initial !important;
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
      padding-right: 32px;

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
  }
}

.v-theme--dark {
  &.vn-snackbar {
    & .v-snackbar__wrapper {
      background-color: var(--md-ref-palette-primary80) !important;
    }
  }
}
</style>

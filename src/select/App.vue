<template>
<v-dialog id="sbi-dialog-select"
    :title="getText('dialogTitle_imageSelection')"
    :cancel-text="getText('buttonText_cancel')"
    :scrollable="scrollableDialog"
    :show-dialog="showDialog"
    @cancel="showDialog = false">

  <div class="mdc-grid-list">
    <ul class="mdc-grid-list__tiles">
      <li class="mdc-grid-tile" v-for="url in imgUrls">
        <div class="mdc-grid-tile__primary">
          <div class="mdc-grid-tile__primary-content tile-container"
              tabindex="0"
              :data-url="url"
              @click="onSelection($event)"
              @keyup.enter="onSelection($event)">
            <img class="tile" :src="url"/>
          </div>
        </div>
      </li>
    </ul>
  </div>
</v-dialog>
</template>

<script>
import {getText} from 'utils/common';

import Dialog from './components/Dialog';

export default {
  components: {
    [Dialog.name]: Dialog
  },

  data: function() {
    return {
      showDialog: false,
      scrollableDialog: false,
      imgUrls: [],
      menuItemId: ''
    };
  },

  methods: {
    getText: getText,

    onMessage: function(e) {
      if (e.source !== window.parent) {
        return;
      }
      if (e.data.id === 'imageSelectionDialogUpdate') {
        this.imgUrls = e.data.imgUrls;
        this.menuItemId = e.data.menuItemId;
        this.scrollableDialog = this.imgUrls.length > 3;
        this.showDialog = true;
      }
    },

    onSelection: function(e) {
      this.showDialog = false;
      browser.runtime.sendMessage({
        id: 'imageSelectionDialogSubmit',
        imgUrl: e.target.dataset.url,
        menuItemId: this.menuItemId
      });
    }
  },

  created: function() {
    window.addEventListener('message', this.onMessage);
  },

  watch: {
    showDialog: function(show) {
      if (!show) {
        window.parent.postMessage({id: 'imageSelectionDialogClose'}, '*');
      }
    }
  }
};
</script>

<style lang="scss">
$mdc-theme-primary: #1abc9c;

@import "@material/grid-list/mdc-grid-list";

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
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  background-color: #bdc3c7;
  transition: all .3s ease;
}

.tile-container:focus::after,
.tile-container:hover::after {
  opacity: .16;
}

.tile {
  max-width: 94%;
  max-height: 94%;
  object-fit: scale-down;
}
</style>

<!-- prettier-ignore -->
<template>
<div id="app" v-show="dataLoaded">
  <div class="header">
    <div class="title">
      {{ getText('extensionName') }}
    </div>
    <div class="header-buttons">
      <v-icon-button class="contribute-button"
          :ripple="false"
          src="/src/contribute/assets/heart.svg"
          @click="showContribute">
      </v-icon-button>

      <v-icon-button class="search-mode-button"
          :ripple="false"
          :src="`/src/icons/modes/${searchModeAction}.svg`"
          @click="openSearchModeMenu">
      </v-icon-button>

      <div class="mdc-menu mdc-menu-surface search-mode-menu">
        <ul class="mdc-list" role="menu" aria-hidden="true" aria-orientation="vertical">
          <li class="mdc-list-item" role="menuitem"
              v-for="option of selectOptions.searchModeAction"
              :key="option.id"
              :data-value="option.id">
            <img class="mdc-list-item__graphic item-icon"
                :src="`/src/icons/modes/${option.id}.svg`">
            <span class="mdc-list-item__text">{{ option.label }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>

  <transition name="settings" v-if="dataLoaded"
      @after-enter="settingsAfterEnter"
      @after-leave="settingsAfterLeave">
    <div class="settings" v-if="searchModeAction === 'url'">
      <v-textfield ref="imageUrlInput" v-model.trim="imageUrl"
          :placeholder="getText('inputPlaceholder_imageUrl')"
          fullwidth>
      </v-textfield>
    </div>
  </transition>

  <div class="list-padding-top"></div>
  <ul class="mdc-list list list-bulk-button" v-if="searchAllEngines">
    <li class="mdc-list-item list-item"
        @click="selectItem('allEngines')">
      <img class="mdc-list-item__graphic list-item-icon"
          :src="getEngineIcon('allEngines')">
      {{ getText('menuItemTitle_allEngines') }}
    </li>
  </ul>
  <ul class="mdc-list list list-separator"
      v-if="searchAllEngines || hasScrollBar">
    <li role="separator" class="mdc-list-divider"></li>
  </ul>
  <div class="list-items-wrap" ref="items" :class="listClasses">
    <resize-observer @notify="handleSizeChange"></resize-observer>
    <ul class="mdc-list list list-items">
      <li class="mdc-list-item list-item"
          v-for="engine in engines"
          :key="engine.id"
          @click="selectItem(engine)">
        <img class="mdc-list-item__graphic list-item-icon"
            :src="getEngineIcon(engine)">
        {{ getText(`menuItemTitle_${engine}`) }}
      </li>
    </ul>
  </div>
</div>
</template>

<script>
import browser from 'webextension-polyfill';
import {ResizeObserver} from 'vue-resize';
import {MDCList} from '@material/list';
import {MDCMenu} from '@material/menu';
import {MDCRipple} from '@material/ripple';
import {IconButton, TextField} from 'ext-components';

import storage from 'storage/storage';
import {
  getEnabledEngines,
  getOptionLabels,
  showNotification,
  validateUrl,
  showContributePage
} from 'utils/app';
import {getText, isAndroid} from 'utils/common';
import {optionKeys} from 'utils/data';
import {targetEnv} from 'utils/config';

export default {
  components: {
    [IconButton.name]: IconButton,
    [TextField.name]: TextField,
    [ResizeObserver.name]: ResizeObserver
  },

  data: function() {
    return {
      dataLoaded: false,

      searchModeAction: '',
      imageUrl: '',
      selectOptions: getOptionLabels(
        {
          searchModeAction: [
            'select',
            'selectUpload',
            'capture',
            'upload',
            'url'
          ]
        },
        'optionValue_action'
      ),
      hasScrollBar: false,
      isPopup: false,

      engines: [],
      searchAllEngines: false
    };
  },

  computed: {
    listClasses: function() {
      return {
        'list-items-max-height': this.isPopup
      };
    }
  },

  methods: {
    getText,

    getEngineIcon: function(engine) {
      let ext = 'svg';
      if (['iqdb', 'karmaDecay', 'tineye', 'whatanime'].includes(engine)) {
        ext = 'png';
      }
      return `/src/icons/engines/${engine}.${ext}`;
    },

    selectItem: function(engine) {
      if (this.searchModeAction === 'url') {
        if (!validateUrl(this.imageUrl)) {
          this.focusImageUrlInput();
          showNotification({messageId: 'error_invalidImageUrl'});
          return;
        }
      }

      browser.runtime.sendMessage({
        id: 'actionPopupSubmit',
        engine,
        imageUrl: this.imageUrl
      });

      this.closeAction();
    },

    showContribute: async function() {
      await showContributePage();
      this.closeAction();
    },

    openSearchModeMenu: function() {
      this.searchModeMenu.open = true;
      document
        .querySelector(
          `.search-mode-menu li[data-value="${this.searchModeAction}"]`
        )
        .focus();
    },

    closeAction: async function() {
      if (!this.isPopup) {
        browser.tabs.remove((await browser.tabs.getCurrent()).id);
      } else {
        window.close();
      }
    },

    focusImageUrlInput: function() {
      this.$refs.imageUrlInput.$refs.input.focus();
    },

    handleSizeChange: function() {
      const items = this.$refs.items;
      this.hasScrollBar = items.scrollHeight > items.clientHeight;
    },

    settingsAfterEnter: function() {
      this.handleSizeChange();
      this.focusImageUrlInput();
    },

    settingsAfterLeave: function() {
      this.handleSizeChange();
      this.imageUrl = '';
    }
  },

  created: async function() {
    const currentTab = await browser.tabs.getCurrent();
    this.isPopup = !currentTab;
    if (!this.isPopup) {
      document.documentElement.style.height = '100%';
      document.body.style.minWidth = 'initial';
    }

    const options = await storage.get(optionKeys, 'sync');
    const enEngines = await getEnabledEngines(options);

    if (
      targetEnv === 'firefox' &&
      (await isAndroid()) &&
      (enEngines.length <= 1 || options.searchAllEnginesAction === 'main')
    ) {
      // Removing the action popup has no effect on Firefox for Android
      showNotification({messageId: 'error_optionsNotApplied'});
      return;
    }

    this.engines = enEngines;
    this.searchAllEngines = options.searchAllEnginesAction === 'sub';
    this.searchModeAction = options.searchModeAction;

    this.$watch('searchModeAction', async function(value) {
      await storage.set({searchModeAction: value}, 'sync');
    });

    this.dataLoaded = true;
  },

  mounted: function() {
    this.searchModeMenu = new MDCMenu(
      document.querySelector('.search-mode-menu')
    );
    this.searchModeMenu.setFixedPosition(true);
    this.searchModeMenu.listen('MDCMenu:selected', ev => {
      this.searchModeAction = ev.detail.item.dataset.value;
    });

    window.setTimeout(() => {
      for (const el of this.searchModeMenu.items) {
        MDCRipple.attachTo(el);
      }

      for (const listEl of document.querySelectorAll(
        '.list-bulk-button, .list-items'
      )) {
        const list = new MDCList(listEl);
        for (const el of list.listElements) {
          MDCRipple.attachTo(el);
        }
      }
    }, 500);
  }
};
</script>

<style lang="scss">
$mdc-theme-primary: #1abc9c;

@import '@material/list/mdc-list';
@import '@material/menu-surface/mdc-menu-surface';
@import '@material/menu/mdc-menu';

@import '@material/icon-button/mixins';
@import '@material/theme/mixins';
@import '@material/typography/mixins';

@import 'vue-resize/dist/vue-resize';

body,
#app {
  height: 100%;
}

#app {
  display: flex;
  flex-direction: column;
}

body {
  margin: 0;
  min-width: 333px;
  overflow: hidden;
  @include mdc-typography-base;
  font-size: 100%;
  background-color: #ffffff;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  white-space: nowrap;
  padding-top: 16px;
  padding-left: 16px;
  padding-right: 16px;
}

.title {
  overflow: hidden;
  text-overflow: ellipsis;
  @include mdc-typography(headline6);
  @include mdc-theme-prop(color, text-primary-on-light);
}

.header-buttons {
  display: flex;
  align-items: center;
  height: 24px;
  margin-left: 56px;
  @media (max-width: 322px) {
    margin-left: 32px;
  }
}

.contribute-button {
  margin-right: 12px;
  @include mdc-icon-button-icon-size(24px, 24px, 8px);
}

.settings {
  padding: 16px;
}

.search-mode-button {
  background-image: url('data:image/svg+xml,%3Csvg%20width%3D%2210px%22%20height%3D%225px%22%20viewBox%3D%227%2010%2010%205%22%20version%3D%221.1%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%3E%0A%20%20%20%20%3Cpolygon%20id%3D%22Shape%22%20stroke%3D%22none%22%20fill%3D%22%23000%22%20fill-rule%3D%22evenodd%22%20opacity%3D%220.54%22%20points%3D%227%2010%2012%2015%2017%2010%22%3E%3C%2Fpolygon%3E%0A%3C%2Fsvg%3E');
  background-position-x: right;
  background-position-y: center;
  background-repeat: no-repeat;
  @include mdc-icon-button-icon-size(24px, 24px, 8px);
  @include mdc-icon-button-ink-color(#00000000);
}

.search-mode-button img {
  margin-left: -16px;
}

.search-mode-menu {
  left: auto !important;
  top: 16px !important;
  right: 16px;
  transform-origin: top right !important;
}

.search-mode-menu .item-icon {
  margin-right: 16px !important;
}

.settings-enter-active,
.settings-leave-active {
  max-height: 100px;
  padding-top: 16px;
  padding-bottom: 16px;
  transition: max-height 0.3s ease, padding-top 0.3s ease,
    padding-bottom 0.3s ease, opacity 0.2s ease;
}

.settings-enter,
.settings-leave-to {
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  opacity: 0;
}

.list {
  padding: 0 !important;
}

.list-padding-top {
  margin-bottom: 8px;
}

.list-bulk-button {
  position: relative;
  height: 48px;
}

.list-separator {
  position: relative;
  height: 1px;
}

.list-items-wrap {
  overflow-y: auto;
}

.list-items-max-height {
  max-height: 392px;
}

.list-items {
  padding-bottom: 8px !important;
}

.list-item {
  padding-left: 16px;
  padding-right: 48px;
  cursor: pointer;
}

.list-item-icon {
  margin-right: 16px !important;
}
</style>

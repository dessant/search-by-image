<template>
  <div id="app" v-show="dataLoaded">
    <div class="header">
      <v-dense-select
        class="search-mode-menu"
        v-model="searchModeAction"
        :options="listItems.searchModeAction"
      >
      </v-dense-select>
      <div class="header-buttons">
        <v-icon-button
          v-if="enableContributions"
          class="contribute-button"
          src="/src/contribute/assets/heart.svg"
          @click="showContribute"
        ></v-icon-button>

        <v-icon-button
          v-if="shareImageEnabled"
          class="share-button"
          src="/src/assets/icons/misc/share.svg"
          @click="shareImage"
        ></v-icon-button>

        <v-icon-button
          class="menu-button"
          src="/src/assets/icons/misc/more.svg"
          @click="showActionMenu"
        >
        </v-icon-button>
      </div>

      <v-menu
        ref="actionMenu"
        class="action-menu"
        :ripple="true"
        :items="listItems.actionMenu"
        @selected="onActionMenuSelect"
      ></v-menu>
    </div>

    <transition
      name="settings"
      v-if="dataLoaded"
      @before-enter="settingsBeforeEnter"
      @before-leave="settingsBeforeLeave"
      @after-enter="settingsAfterEnter"
      @after-leave="settingsAfterLeave"
    >
      <div class="settings" v-if="searchModeAction === 'url'">
        <v-textfield
          ref="imageUrlInput"
          v-model.trim="imageUrl"
          :placeholder="getText('inputPlaceholder_imageUrl')"
          fullwidth
        ></v-textfield>
      </div>
    </transition>

    <div class="list-padding-top"></div>
    <ul class="mdc-list list list-bulk-button" v-if="searchAllEngines">
      <li class="mdc-list-item list-item" @click="selectItem('allEngines')">
        <img
          class="mdc-list-item__graphic list-item-icon"
          :src="getEngineIcon('allEngines')"
        />
        {{ getText('menuItemTitle_allEngines') }}
      </li>
    </ul>
    <ul class="mdc-list list list-separator" :class="separatorClasses">
      <li role="separator" class="mdc-list-divider"></li>
    </ul>
    <div class="list-items-wrap" ref="items" @scroll="onListScroll">
      <resize-observer @notify="onListSizeChange"></resize-observer>
      <ul class="mdc-list list list-items">
        <li
          class="mdc-list-item list-item"
          v-for="engine in engines"
          :key="engine.id"
          @click="selectItem(engine)"
        >
          <img
            class="mdc-list-item__graphic list-item-icon"
            :src="getEngineIcon(engine)"
          />
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
import {MDCRipple} from '@material/ripple';
import {IconButton, TextField, Menu} from 'ext-components';

import storage from 'storage/storage';
import {
  getEnabledEngines,
  showNotification,
  validateUrl,
  getListItems,
  showContributePage,
  showProjectPage
} from 'utils/app';
import {getText, getActiveTab, createTab} from 'utils/common';
import {enableContributions} from 'utils/config';
import {optionKeys} from 'utils/data';

import DenseSelect from './components/DenseSelect';

export default {
  components: {
    [IconButton.name]: IconButton,
    [TextField.name]: TextField,
    [Menu.name]: Menu,
    [DenseSelect.name]: DenseSelect,
    [ResizeObserver.name]: ResizeObserver
  },

  data: function () {
    let searchModeAction = [
      'select',
      'selectUpload',
      'capture',
      'upload',
      'url'
    ];
    if (this.$isSamsung || (this.$isSafari && this.$isMobile)) {
      // Samsung Internet 13: tabs.captureVisibleTab fails.
      // Safari 15: captured tab image is padded on mobile.
      searchModeAction = searchModeAction.filter(item => item !== 'capture');
    }

    return {
      dataLoaded: false,

      searchModeAction: '',
      imageUrl: '',
      listItems: {
        ...getListItems(
          {actionMenu: ['options', 'website']},
          {scope: 'actionMenu'}
        ),
        ...getListItems(
          {searchModeAction},
          {scope: 'optionValue_action_searchModeAction'}
        )
      },
      hasScrollBar: false,

      engines: [],
      searchAllEngines: false,
      shareImageEnabled: false,
      enableContributions
    };
  },

  computed: {
    separatorClasses: function () {
      return {
        visible: this.searchAllEngines || this.hasScrollBar
      };
    }
  },

  methods: {
    getText,

    getEngineIcon: function (engine) {
      let ext = 'svg';
      if (
        ['iqdb', 'karmaDecay', 'tineye', 'whatanime', 'repostSleuth'].includes(
          engine
        )
      ) {
        ext = 'png';
      } else if (['branddb', 'madridMonitor'].includes(engine)) {
        engine = 'wipo';
      }
      return `/src/assets/icons/engines/${engine}.${ext}`;
    },

    selectItem: function (engine) {
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

    shareImage: function () {
      browser.runtime.sendMessage({id: 'initShare'});

      this.closeAction();
    },

    showContribute: async function () {
      await showContributePage();
      this.closeAction();
    },

    showOptions: async function () {
      if (this.$isSamsung) {
        // Samsung Internet 13: runtime.openOptionsPage fails.
        await createTab(browser.runtime.getURL('/src/options/index.html'));
      } else {
        await browser.runtime.openOptionsPage();
      }

      this.closeAction();
    },

    showWebsite: async function () {
      await showProjectPage();
      this.closeAction();
    },

    showActionMenu: function () {
      this.$refs.actionMenu.$emit('open');
    },

    onActionMenuSelect: async function (item) {
      if (item === 'options') {
        await this.showOptions();
      } else if (item === 'website') {
        await this.showWebsite();
      }
    },

    closeAction: async function () {
      const currentTab = await browser.tabs.getCurrent();

      // Safari 14: tabs.getCurrent returns active tab instead of undefined.
      if (
        currentTab &&
        currentTab.id !== browser.tabs.TAB_ID_NONE &&
        !this.$isSafari
      ) {
        browser.tabs.remove(currentTab.id);
      } else {
        window.close();
      }
    },

    focusImageUrlInput: function () {
      this.$refs.imageUrlInput.$refs.input.focus();
    },

    settingsBeforeEnter: function () {
      this.lockPopupHeight();
    },

    settingsBeforeLeave: function () {
      this.lockPopupHeight();
    },

    settingsAfterEnter: function () {
      this.configureScrollBar();
      this.focusImageUrlInput();
    },

    settingsAfterLeave: function () {
      this.unlockPopupHeight();
      this.configureScrollBar();
      this.imageUrl = '';
    },

    onListSizeChange: function () {
      this.configureScrollBar();
      if (this.$isMobile && this.$isSafari) {
        // Safari 15: window.onresize is not always fired on mobile.
        this.setViewportSize();
      }
    },

    onListScroll: function () {
      this.configureScrollBar();
    },

    configureScrollBar: function () {
      if (this.$isAndroid || this.$isSafari) {
        this.hasScrollBar = this.$refs.items.scrollTop;
      } else {
        const items = this.$refs.items;
        this.hasScrollBar = items.scrollHeight > items.clientHeight;
      }
    },

    lockPopupHeight: function () {
      if (
        (this.$isAndroid || this.$isFirefox) &&
        !document.documentElement.style.height
      ) {
        const {height} = document.documentElement.getBoundingClientRect();
        document.documentElement.style.height = `${height}px`;
      }
    },

    unlockPopupHeight: function () {
      if (
        (this.$isAndroid || this.$isFirefox) &&
        document.documentElement.style.height.endsWith('px')
      ) {
        document.documentElement.style.height = '';
      }
    },

    setViewportSize: async function () {
      const activeTab = await getActiveTab();
      const actionWidth = window.innerWidth;

      if (activeTab && actionWidth && activeTab.width > actionWidth) {
        // popup
        if (this.$isMobile) {
          // mobile popup
          if (activeTab.width < 394) {
            document.body.style.minWidth = `${activeTab.width - 40}px`;
          } else {
            document.body.style.minWidth = '354px';
          }
          this.$el.style.maxHeight = `${activeTab.height - 40}px`;
          document.documentElement.style.height = '';

          if (this.$isIpados) {
            this.$refs.items.style.maxHeight = '392px';
          }
        } else {
          // desktop popup
          this.$refs.items.style.maxHeight = '392px';
        }
      } else {
        // full-width page
        document.documentElement.style.height = '100%';
        if (activeTab && activeTab.width >= 354) {
          document.body.style.minWidth = '354px';
        } else {
          document.body.style.minWidth = 'initial';
        }
        this.$el.style.maxHeight = 'initial';
        this.$refs.items.style.maxHeight = 'initial';
      }
    }
  },

  created: async function () {
    window.addEventListener('resize', this.setViewportSize);
    window.addEventListener('orientationchange', () =>
      window.setTimeout(this.setViewportSize, 1000)
    );
    await this.setViewportSize();

    const options = await storage.get(optionKeys);
    const enEngines = await getEnabledEngines(options);

    if (
      this.$isFirefox &&
      this.$isAndroid &&
      (enEngines.length <= 1 || options.searchAllEnginesAction === 'main')
    ) {
      // Firefox for Android: removing the action popup has no effect.
      showNotification({messageId: 'error_optionsNotApplied'});
      return;
    }

    this.engines = enEngines;
    this.searchAllEngines =
      options.searchAllEnginesAction === 'sub' && !this.$isSamsung;
    this.searchModeAction = options.searchModeAction;

    this.shareImageEnabled = options.shareImageAction && this.$isSamsung;

    this.$watch('searchModeAction', async function (value) {
      await storage.set({searchModeAction: value});
    });

    this.dataLoaded = true;
  },

  mounted: function () {
    window.setTimeout(() => {
      for (const listEl of document.querySelectorAll(
        '.list-bulk-button, .list-items'
      )) {
        const list = new MDCList(listEl);
        for (const el of list.listElements) {
          MDCRipple.attachTo(el);
        }
      }

      if (this.searchModeAction === 'url' && !this.$isMobile) {
        this.focusImageUrlInput();
      }

      if (this.$isMobile && this.$isSafari) {
        // Safari 15: window.onresize is not always fired on mobile.
        this.setViewportSize();
      }
    }, 500);
  }
};
</script>

<style lang="scss">
@import '@material/list/mdc-list';
@import '@material/select/mdc-select';

@import '@material/icon-button/mixins';
@import '@material/theme/mixins';
@import '@material/textfield/mixins';
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
  min-width: 354px;
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
  padding-right: 4px;
}

.header-buttons {
  display: flex;
  align-items: center;
  height: 24px;
  margin-left: 56px;
}

.contribute-button,
.share-button,
.menu-button {
  @include mdc-icon-button-icon-size(24px, 24px, 6px);

  &::before {
    --mdc-ripple-fg-size: 20px;
    --mdc-ripple-fg-scale: 1.8;
    --mdc-ripple-left: 8px;
    --mdc-ripple-top: 8px;
  }
}

.contribute-button {
  margin-left: 12px;
}

.share-button {
  @include mdc-icon-button-icon-size(20px, 20px, 8px);
  margin-left: 12px;
}

.menu-button {
  margin-left: 4px;
}

.search-mode-menu .mdc-select__menu {
  position: fixed !important;
  top: 56px !important;
  left: 16px !important;
}

.action-menu {
  left: auto !important;
  top: 56px !important;
  right: 16px;
  transform-origin: top right !important;
}

.settings {
  padding: 16px;
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
  opacity: 0;
  transition: opacity 0.1s ease;
}

.visible {
  opacity: 1;
}

.list-items-wrap {
  overflow-y: auto;
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

.mdc-list {
  padding: 0;
}

.mdc-list-item {
  @include mdc-theme-prop(color, #252525);
}

.mdc-menu-surface {
  border-radius: 16px;
}

.mdc-text-field {
  @include mdc-text-field-ink-color(#252525);
  @include mdc-text-field-caret-color(#8188e9);
  @include mdc-text-field-bottom-line-color(#4e5bb6);
  @include mdc-text-field-line-ripple-color(#8188e9);
}

.mdc-select {
  @include mdc-select-ink-color(#252525);

  & .mdc-select__dropdown-icon {
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24px' viewBox='0 0 24 24' width='24px' fill='%23454545'%3E%3Cpath d='M0 0h24v24H0V0z' fill='none'/%3E%3Cpath d='M8.71 11.71l2.59 2.59c.39.39 1.02.39 1.41 0l2.59-2.59c.63-.63.18-1.71-.71-1.71H9.41c-.89 0-1.33 1.08-.7 1.71z'/%3E%3C/svg%3E")
      no-repeat center !important;
  }
}

html.firefox.android {
  height: 100%;
}

.safari {
  & .list-item:hover::before {
    opacity: 0 !important;
  }
}
</style>

<template>
<div id="app" v-show="dataLoaded">
  <div class="header">
    <div class="title">
      {{ getText('extensionName') }}
    </div>
    <div class="header-buttons">
      <img class="contribute-icon"
          src="/src/contribute/assets/heart.svg"
          @click="showContribute">
      <v-select class="search-mode" v-if="dataLoaded"
          v-model="searchModeAction"
          :options="selectOptions.searchModeAction">
        <template slot="selection" slot-scope="data">
          <img class="mdc-list-item__graphic item-icon-selected"
              :src="`/src/icons/modes/${data.selection}.svg`">
          <div class="mdc-select__label"></div>
          <div class="mdc-select__selected-text"></div>
          <div class="mdc-select__bottom-line"></div>
        </template>
        <template slot="options" slot-scope="data">
          <li class="mdc-list-item" role="option" tabindex="0"
              v-for="option in data.options"
              :key="option.id"
              :id="option.id"
              :aria-selected="data.selection === option.id">
            <img class="mdc-list-item__graphic item-icon"
                :src="`/src/icons/modes/${option.id}.svg`">
            {{ option.label }}
          </li>
        </template>
      </v-select>
    </div>
  </div>

  <transition name="settings" v-if="dataLoaded"
      @after-enter="handleSizeChange"
      @after-leave="settingsAfterLeave">
    <div class="settings" v-if="searchModeAction === 'url'">
      <v-textfield v-model="imageUrl"
          :placeholder="getText('inputPlaceholder_imageUrl')"
          :fullwidth="true">
      </v-textfield>
    </div>
  </transition>

  <div class="list-padding-top"></div>
  <ul class="mdc-list list list-bulk-button" v-if="searchAllEngines">
    <li class="mdc-list-item list-item ripple-surface"
        @click="selectItem('allEngines')">
      <img class="mdc-list-item__graphic list-item-icon"
          src="/src/icons/engines/allEngines.png">
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
      <li class="mdc-list-item list-item ripple-surface"
          v-for="engine in engines"
          :key="engine.id"
          @click="selectItem(engine)">
        <img class="mdc-list-item__graphic list-item-icon"
            :src="`/src/icons/engines/${engine}.png`">
        {{ getText(`menuItemTitle_${engine}`) }}
      </li>
    </ul>
  </div>
</div>
</template>

<script>
import browser from 'webextension-polyfill';
import {ResizeObserver} from 'vue-resize';
import {Select, TextField} from 'ext-components';

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
    [Select.name]: Select,
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
          searchModeAction: ['select', 'upload', 'url']
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

    selectItem: function(engine) {
      let imageUrl;
      if (this.searchModeAction === 'url') {
        imageUrl = this.imageUrl.trim();
        if (!imageUrl || !validateUrl(imageUrl)) {
          showNotification({messageId: 'error_invalidImageUrl'});
          return;
        }
      }

      browser.runtime.sendMessage({
        id: 'actionPopupSubmit',
        engine,
        imageUrl
      });

      this.closeAction();
    },

    showContribute: async function() {
      await showContributePage();
      this.closeAction();
    },

    closeAction: async function() {
      if (!this.isPopup) {
        browser.tabs.remove((await browser.tabs.getCurrent()).id);
      } else {
        window.close();
      }
    },

    handleSizeChange: function() {
      const items = this.$refs.items;
      this.hasScrollBar = items.scrollHeight > items.clientHeight;
    },

    settingsAfterLeave: function() {
      this.handleSizeChange();
      this.imageUrl = '';
    }
  },

  created: async function() {
    const currentTab = await browser.tabs.getCurrent();
    this.isPopup = !currentTab || currentTab instanceof Array;
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
      // Removing the action popup has no effect on Android
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
  }
};
</script>

<style lang="scss">
$mdc-theme-primary: #1abc9c;

@import '@material/list/mdc-list';
@import '@material/theme/mixins';
@import '@material/typography/mixins';
@import "@material/ripple/mixins";

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
  min-width: 323px;
  overflow: hidden;
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
  @include mdc-typography('title');
  @include mdc-theme-prop('color', 'text-primary-on-light');
}

.header-buttons {
  display: flex;
  align-items: center;
  margin-left: 56px;
  @media (max-width: 322px) {
    margin-left: 32px;
  }
}

.contribute-icon {
  margin-right: 16px;
  cursor: pointer;
}

.settings {
  padding: 16px;
}

.search-mode {
  height: auto !important;
  background-position: 100% !important;
}

.search-mode .mdc-select__selected-text,
.search-mode .mdc-select__bottom-line {
  width: 0 !important;
}

.search-mode .mdc-select__surface {
  width: auto !important;
  height: auto !important;
  padding-right: 16px !important;
  padding-bottom: 0 !important;
}

.search-mode .item-icon-selected {
  margin-right: 0 !important;
}

.search-mode .mdc-select__menu {
  left: auto !important;
  top: 0 !important;
  right: 0 !important;
  transform-origin: top right !important;
}

.settings-enter-active, .settings-leave-active {
  max-height: 100px;
  padding-top: 16px;
  padding-bottom: 16px;
  transition: max-height .3s ease,
              padding-top .3s ease,
              padding-bottom .3s ease,
              opacity .2s ease;
}

.settings-enter, .settings-leave-to {
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

.ripple-surface {
  @include mdc-ripple-surface;
  @include mdc-ripple-radius-bounded;
  @include mdc-states;

  position: sticky;
  outline: none;
  overflow: hidden;
}
</style>

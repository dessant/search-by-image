<template>
<div id="app" v-show="dataLoaded">
  <div class="header">
    <div class="title">
      {{ getText('extensionName') }}
    </div>
    <v-select class="search-mode" v-if="dataLoaded"
        v-model="searchModeAction"
        :options="selectOptions.searchModeAction">
      <template slot="selection" scope="data">
        <img class="mdc-list-item__start-detail item-icon-selected"
            :src="`/src/icons/modes/${data.selection}.svg`">
        <span class="mdc-select__selected-text"></span>
      </template>
      <template slot="options" scope="data">
        <li class="mdc-list-item" role="option" tabindex="0"
            v-for="option in data.options"
            :key="option.id"
            :id="option.id"
            :aria-selected="data.selection === option.id">
          <img class="mdc-list-item__start-detail item-icon"
              :src="`/src/icons/modes/${option.id}.svg`">
          {{ option.label }}
        </li>
      </template>
    </v-select>
  </div>

  <transition name="settings" v-if="dataLoaded" @after-leave="imageUrl = ''">
    <div class="settings" v-if="searchModeAction === 'url'">
      <v-textfield v-model="imageUrl"
          :placeholder="getText('inputPlaceholder_imageUrl')"
          :fullwidth="true">
      </v-textfield>
    </div>
  </transition>

  <ul class="mdc-list list">
    <li class="mdc-list-item item ripple-surface"
        v-if="searchAllEngines"
        @click="selectItem('allEngines')">
      <img class="mdc-list-item__start-detail item-icon"
          src="/src/icons/engines/allEngines.png">
      {{ getText('menuItemTitle_allEngines') }}
    </li>
    <li role="separator" class="mdc-list-divider"
        v-if="searchAllEngines || engines.length > 8">
    </li>
    <div class="items-wrap">
      <div class="items">
        <li class="mdc-list-item item ripple-surface"
            v-for="engine in engines"
            :key="engine.id"
            @click="selectItem(engine)">
          <img class="mdc-list-item__start-detail item-icon"
              :src="`/src/icons/engines/${engine}.png`">
          {{ getText(`menuItemTitle_${engine}`) }}
        </li>
      </div>
    </div>
  </ul>
</div>
</template>

<script>
import browser from 'webextension-polyfill';

import storage from 'storage/storage';
import {
  getEnabledEngines,
  getOptionLabels,
  showNotification,
  validateUrl
} from 'utils/app';
import {getText} from 'utils/common';
import {optionKeys} from 'utils/data';
import Select from 'components/Select';
import Textfield from 'components/Textfield';

export default {
  components: {
    [Select.name]: Select,
    [Textfield.name]: Textfield
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

      engines: [],
      searchAllEngines: false
    };
  },

  methods: {
    getText: getText,

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
      window.close();
    }
  },

  created: async function() {
    const options = await storage.get(optionKeys, 'sync');
    const enEngines = await getEnabledEngines(options);

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

body {
  margin: 0;
  min-width: 300px;
  min-height: 232px;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16px;
  padding-left: 16px;
  padding-right: 16px;
}

.title {
  padding-right: 48px;
  white-space: nowrap;
  @include mdc-typography('title');
  @include mdc-theme-prop('color', 'text-primary-on-light');
}

.settings {
  padding: 16px;
}

.search-mode {
  width: auto !important;
  border: 0 !important;
  padding-right: 16px !important;
  background-color: transparent !important;
}

.search-mode .mdc-select__menu {
  left: auto !important;
  right: 16px !important;
  transform-origin: top right !important;
}

.search-mode .mdc-select__selected-text {
  width: 0 !important;
}

.search-mode .item-icon-selected {
  margin-right: 0 !important;
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

.items-wrap {
  max-height: 392px;
  overflow-y: auto;
}

.items {
  margin-bottom: 8px;
}

.list {
  padding-left: 0 !important;
  padding-right: 0 !important;
}

.item {
  padding-left: 16px;
  padding-right: 48px;
  white-space: nowrap;
  cursor: pointer;
}

.item-icon {
  margin-right: 16px !important;
}

.ripple-surface {
  @include mdc-ripple-base;
  @include mdc-ripple-bg((pseudo: "::before"));
  @include mdc-ripple-fg((pseudo: "::after"));

  overflow: hidden;
}
</style>

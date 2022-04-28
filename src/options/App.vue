<template>
  <div id="app" v-if="dataLoaded" :class="appClasses">
    <div class="section-engines">
      <div class="section-title" v-once>
        {{ getText('optionSectionTitle_engines') }}
      </div>
      <div class="section-desc" v-once>
        {{ getText('optionSectionDescription_engines') }}
      </div>
      <v-draggable class="option-wrap" :list="options.engines" :delay="120">
        <div class="option" v-for="engine in options.engines" :key="engine.id">
          <v-form-field
            :input-id="engine"
            :label="getText(`optionTitle_${engine}`)"
          >
            <v-checkbox
              :id="engine"
              :checked="engineEnabled(engine)"
              @change="setEngineState(engine, $event)"
            >
            </v-checkbox>
          </v-form-field>
        </div>
      </v-draggable>
    </div>

    <div class="section-context-menu" v-if="contextMenuEnabled">
      <div class="section-title" v-once>
        {{ getText('optionSectionTitle_contextmenu') }}
      </div>
      <div class="option-wrap">
        <div class="option">
          <v-form-field
            input-id="sic"
            :label="getText('optionTitle_showInContextMenu')"
          >
            <v-switch id="sic" v-model="options.showInContextMenu"></v-switch>
          </v-form-field>
        </div>
        <div class="option select">
          <v-select
            :label="getText('optionTitle_searchMode')"
            v-model="options.searchModeContextMenu"
            :options="listItems.searchModeContextMenu"
            outlined
          >
          </v-select>
        </div>
        <div class="option select" v-if="searchAllEnginesEnabled">
          <v-select
            :label="getText('optionTitle_searchAllEngines')"
            v-model="options.searchAllEnginesContextMenu"
            :options="listItems.searchAllEnginesContextMenu"
            outlined
          >
          </v-select>
        </div>
        <div class="option" v-if="shareEnabled">
          <v-form-field
            input-id="sicm"
            :label="getText('optionTitle_shareImageContextMenu')"
          >
            <v-switch
              id="sicm"
              v-model="options.shareImageContextMenu"
            ></v-switch>
          </v-form-field>
        </div>
      </div>
    </div>

    <div class="section-toolbar">
      <div class="section-title" v-once>
        {{
          getText(
            $env.isMobile
              ? 'optionSectionTitleMobile_toolbar'
              : 'optionSectionTitle_toolbar'
          )
        }}
      </div>
      <div class="option-wrap">
        <div class="option select">
          <v-select
            :label="getText('optionTitle_searchMode')"
            v-model="options.searchModeAction"
            :options="listItems.searchModeAction"
            outlined
          >
          </v-select>
        </div>
        <div class="option select" v-if="searchAllEnginesEnabled">
          <v-select
            :label="getText('optionTitle_searchAllEngines')"
            v-model="options.searchAllEnginesAction"
            :options="listItems.searchAllEnginesAction"
            outlined
          >
          </v-select>
        </div>
        <div class="option" v-if="shareEnabled">
          <v-form-field
            input-id="sia"
            :label="getText('optionTitle_shareImageAction')"
          >
            <v-switch id="sia" v-model="options.shareImageAction"></v-switch>
          </v-form-field>
        </div>
        <div
          class="option"
          v-if="options.searchModeAction === 'upload' && autoPasteEnabled"
        >
          <v-form-field
            input-id="ap"
            :label="getText('optionTitle_autoPasteAction')"
          >
            <v-switch id="ap" v-model="options.autoPasteAction"></v-switch>
          </v-form-field>
        </div>
      </div>
    </div>

    <div class="section-misc">
      <div class="section-title" v-once>
        {{ getText('optionSectionTitle_misc') }}
      </div>
      <div class="option-wrap">
        <div class="option" v-if="!$env.isAndroid">
          <v-form-field
            input-id="tib"
            :label="getText('optionTitle_tabInBackgound')"
          >
            <v-switch id="tib" v-model="options.tabInBackgound"></v-switch>
          </v-form-field>
        </div>
        <div class="option">
          <v-form-field
            input-id="ifp"
            :label="getText('optionTitle_imgFullParse')"
          >
            <v-switch id="ifp" v-model="options.imgFullParse"></v-switch>
          </v-form-field>
        </div>
        <div class="option" v-if="shareEnabled">
          <v-form-field
            input-id="csi"
            :label="getText('optionTitle_convertSharedImage')"
          >
            <v-switch id="csi" v-model="options.convertSharedImage"></v-switch>
          </v-form-field>
        </div>
        <div class="option" v-if="pasteEnabled">
          <v-form-field
            input-id="cp"
            :label="getText('optionTitle_confirmPaste')"
          >
            <v-switch id="cp" v-model="options.confirmPaste"></v-switch>
          </v-form-field>
        </div>
        <div class="option">
          <v-form-field
            input-id="bih"
            :label="getText('optionTitle_bypassImageHostBlocking')"
          >
            <v-switch
              id="bih"
              v-model="options.bypassImageHostBlocking"
            ></v-switch>
          </v-form-field>
        </div>
        <div class="option">
          <v-form-field
            input-id="lg"
            :label="getText('optionTitle_localGoogle')"
          >
            <v-switch id="lg" v-model="options.localGoogle"></v-switch>
          </v-form-field>
        </div>
      </div>
    </div>

    <div class="section-placeholder"></div>
  </div>
</template>

<script>
import {includes, without} from 'lodash-es';
import draggable from 'vuedraggable';
import {Checkbox, FormField, Switch, Select} from 'ext-components';

import storage from 'storage/storage';
import {getListItems, canShare} from 'utils/app';
import {getText} from 'utils/common';
import {optionKeys} from 'utils/data';

export default {
  components: {
    'v-draggable': draggable,
    [Checkbox.name]: Checkbox,
    [Switch.name]: Switch,
    [Select.name]: Select,
    [FormField.name]: FormField
  },

  data: function () {
    let searchModeContextMenu = ['select', 'selectUpload', 'capture'];
    let searchModeAction = [
      'select',
      'selectUpload',
      'capture',
      'upload',
      'url'
    ];
    if (this.$env.isSamsung || (this.$env.isSafari && this.$env.isMobile)) {
      // Samsung Internet 13: tabs.captureVisibleTab fails.
      // Safari 15: captured tab image is padded on mobile.
      searchModeContextMenu = searchModeContextMenu.filter(
        item => item !== 'capture'
      );
      searchModeAction = searchModeAction.filter(item => item !== 'capture');
    }

    return {
      dataLoaded: false,

      listItems: {
        ...getListItems(
          {
            searchAllEnginesContextMenu: ['main', 'sub', 'false']
          },
          {scope: 'optionValue_searchAllEnginesContextMenu'}
        ),
        ...getListItems(
          {searchModeContextMenu},
          {scope: 'optionValue_searchModeContextMenu'}
        ),
        ...getListItems(
          {searchAllEnginesAction: ['main', 'sub', 'false']},
          {
            scope: this.$env.isMobile
              ? 'optionValue_searchAllEnginesActionMobile'
              : 'optionValue_searchAllEnginesAction'
          }
        ),
        ...getListItems(
          {searchModeAction},
          {scope: 'optionValue_searchModeAction'}
        )
      },
      contextMenuEnabled: true,
      searchAllEnginesEnabled: true,
      shareEnabled: true,
      autoPasteEnabled: true,
      pasteEnabled: true,

      options: {
        engines: [],
        disabledEngines: [],
        showInContextMenu: false,
        searchAllEnginesContextMenu: '',
        searchAllEnginesAction: '',
        tabInBackgound: false,
        localGoogle: false,
        imgFullParse: false,
        searchModeAction: '',
        searchModeContextMenu: '',
        bypassImageHostBlocking: false,
        shareImageContextMenu: false,
        shareImageAction: false,
        convertSharedImage: false,
        autoPasteAction: false,
        confirmPaste: false
      }
    };
  },

  computed: {
    appClasses: function () {
      return {
        'feature-context-menu': this.contextMenuEnabled
      };
    }
  },

  methods: {
    getText,

    setup: async function () {
      const options = await storage.get(optionKeys);

      for (const option of Object.keys(this.options)) {
        this.options[option] = options[option];

        this.$watch(`options.${option}`, async function (value) {
          await storage.set({[option]: value});
          await browser.runtime.sendMessage({id: 'optionChange'});
        });
      }

      this.searchAllEnginesEnabled = !this.$env.isSamsung;

      this.contextMenuEnabled = !(this.$env.isMobile && !this.$env.isSamsung);

      this.shareEnabled = canShare(this.$env);

      this.pasteEnabled =
        !this.$env.isSamsung && !(this.$env.isMobile && this.$env.isFirefox);

      this.autoPasteEnabled =
        !this.$env.isSafari &&
        !this.$env.isSamsung &&
        !(this.$env.isMobile && this.$env.isFirefox);

      this.dataLoaded = true;
    },

    engineEnabled: function (engine) {
      return !includes(this.options.disabledEngines, engine);
    },

    setEngineState: async function (engine, enabled) {
      if (enabled) {
        this.options.disabledEngines = without(
          this.options.disabledEngines,
          engine
        );
      } else {
        this.options.disabledEngines.push(engine);
      }
    }
  },

  created: async function () {
    document.title = getText('pageTitle', [
      getText('pageTitle_options'),
      getText('extensionName')
    ]);

    this.setup();
  }
};
</script>

<style lang="scss">
@import '@material/select/mdc-select';
@import '@material/checkbox/mixins';
@import '@material/switch/mixins';
@import '@material/theme/mixins';
@import '@material/typography/mixins';

body {
  margin: 0;
  @include mdc-typography-base;
  font-size: 100%;
  background-color: #ffffff;
  overflow: visible !important;
}

#app {
  display: grid;
  grid-row-gap: 32px;
  grid-column-gap: 48px;
  padding: 24px;
}

.mdc-checkbox {
  @include mdc-checkbox-container-colors(#8188e9, #00000000, #8188e9, #8188e9);
  @include mdc-checkbox-focus-indicator-color(#8188e9);
  margin-right: 4px;
}

.mdc-switch {
  @include mdc-switch-toggled-on-color(#8188e9);
  margin-right: 16px;
}

.mdc-select {
  @include mdc-select-ink-color(#252525);
  @include mdc-select-focused-label-color(#252525);
  @include mdc-select-outline-color(#777777);
  @include mdc-select-hover-outline-color(#8188e9);
  @include mdc-select-focused-outline-color(#8188e9);
  @include mdc-select-outline-shape-radius(16px);

  & .mdc-select__dropdown-icon {
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24px' viewBox='0 0 24 24' width='24px' fill='%23454545'%3E%3Cpath d='M0 0h24v24H0V0z' fill='none'/%3E%3Cpath d='M8.71 11.71l2.59 2.59c.39.39 1.02.39 1.41 0l2.59-2.59c.63-.63.18-1.71-.71-1.71H9.41c-.89 0-1.33 1.08-.7 1.71z'/%3E%3C/svg%3E")
      no-repeat center !important;
    top: 50% !important;
    transform: translateY(-50%);
  }

  &.mdc-select--activated .mdc-select__dropdown-icon {
    transform: rotate(180deg) translateY(50%);
  }

  & .mdc-list {
    padding: 0 !important;
  }

  & .mdc-menu-surface {
    border-radius: 16px !important;
  }
}

.section-title,
.section-desc,
.mdc-form-field,
.mdc-list-item {
  @include mdc-theme-prop(color, #252525);
}

.section-title {
  @include mdc-typography(headline6);
}

.section-desc {
  @include mdc-typography(body2);
  padding-top: 8px;
}

.section-placeholder {
  display: none;
}

.option-wrap {
  display: grid;
  grid-row-gap: 24px;
  padding-top: 24px;
  grid-auto-columns: min-content;
}

.option {
  display: flex;
  align-items: center;
  height: 24px;

  & .mdc-form-field {
    max-width: calc(100vw - 48px);

    & label {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }
}

.option.select {
  align-items: start;
  height: 56px;

  & .mdc-select__anchor,
  & .mdc-select__menu {
    max-width: calc(100vw - 48px);
  }

  & .mdc-select__selected-text {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

@media (min-width: 1024px) {
  #app {
    grid-template-columns: 464px 464px;
    grid-template-rows: min-content min-content 1fr;
    grid-template-areas:
      'engines toolbar'
      'engines misc'
      'engines placeholder';

    &.feature-context-menu {
      grid-template-rows: min-content min-content min-content 1fr;
      grid-template-areas:
        'engines context-menu'
        'engines toolbar'
        'engines misc'
        'engines placeholder';
    }
  }

  .section-engines {
    grid-area: engines;
  }

  .section-context-menu {
    grid-area: context-menu;
  }

  .section-toolbar {
    grid-area: toolbar;
  }

  .section-misc {
    grid-area: misc;
  }

  .section-placeholder {
    grid-area: placeholder;
    display: initial;
  }
}
</style>

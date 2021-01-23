<template>
  <div id="app" v-if="dataLoaded">
    <div class="section">
      <div class="section-title" v-once>
        {{ getText('optionSectionTitle_engines') }}
      </div>
      <div class="section-desc" v-once>
        {{ getText('optionSectionDescription_engines') }}
      </div>
      <v-draggable
        class="option-wrap"
        :list="options.engines"
        :delay="120"
        :delay-on-touch-only="true"
      >
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

    <div class="section" v-if="contextMenuEnabled">
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
          >
          </v-select>
        </div>
        <div class="option select" v-if="searchAllEnginesEnabled">
          <v-select
            :label="getText('optionTitle_searchAllEngines')"
            v-model="options.searchAllEnginesContextMenu"
            :options="listItems.searchAllEnginesContextMenu"
          >
          </v-select>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title" v-once>
        {{
          getText(
            $isAndroid
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
          >
          </v-select>
        </div>
        <div class="option select" v-if="searchAllEnginesEnabled">
          <v-select
            :label="getText('optionTitle_searchAllEngines')"
            v-model="options.searchAllEnginesAction"
            :options="listItems.searchAllEnginesAction"
          >
          </v-select>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title" v-once>
        {{ getText('optionSectionTitle_misc') }}
      </div>
      <div class="option-wrap">
        <div class="option" v-if="!$isAndroid">
          <v-form-field
            input-id="tib"
            :label="getText('optionTitle_tabInBackgound')"
          >
            <v-switch id="tib" v-model="options.tabInBackgound"></v-switch>
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
            input-id="ifp"
            :label="getText('optionTitle_imgFullParse')"
          >
            <v-switch id="ifp" v-model="options.imgFullParse"></v-switch>
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
  </div>
</template>

<script>
import browser from 'webextension-polyfill';
import {includes, without} from 'lodash-es';
import draggable from 'vuedraggable';
import {Checkbox, FormField, Switch, Select} from 'ext-components';

import storage from 'storage/storage';
import {getListItems} from 'utils/app';
import {getText} from 'utils/common';
import {optionKeys} from 'utils/data';
import {targetEnv} from 'utils/config';

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
    if (targetEnv === 'samsung') {
      // Samsung Internet 13: tabs.captureVisibleTab fails.
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
            scope: this.$isAndroid
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
        bypassImageHostBlocking: false
      }
    };
  },

  methods: {
    getText,

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
    const options = await storage.get(optionKeys, 'sync');

    for (const option of Object.keys(this.options)) {
      this.options[option] = options[option];
      this.$watch(`options.${option}`, async function (value) {
        await storage.set({[option]: value}, 'sync');
      });
    }

    if (targetEnv === 'samsung') {
      this.searchAllEnginesEnabled = false;
    } else {
      if (this.$isAndroid) {
        this.contextMenuEnabled = false;
      }
    }

    document.title = getText('pageTitle', [
      getText('pageTitle_options'),
      getText('extensionName')
    ]);

    this.dataLoaded = true;
  }
};
</script>

<style lang="scss">
$mdc-theme-primary: #1abc9c;

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
  padding: 24px;
}

.mdc-checkbox {
  margin-right: 4px;
}

.mdc-switch {
  margin-right: 16px;
}

.section-title,
.section-desc {
  @include mdc-theme-prop(color, text-primary-on-light);
}

.section-title {
  @include mdc-typography(headline6);
}

.section-desc {
  @include mdc-typography(body2);
  padding-top: 8px;
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

.firefox.android {
  & .section-title,
  & .section-desc,
  & .mdc-form-field,
  & .mdc-list-item {
    @include mdc-theme-prop(color, #20123a);
  }

  & .mdc-checkbox {
    @include mdc-checkbox-container-colors(
      #312a65,
      #00000000,
      #312a65,
      #312a65
    );
    @include mdc-checkbox-focus-indicator-color(#312a65);
  }

  & .mdc-switch {
    @include mdc-switch-toggled-on-color(#312a65);
  }

  & .mdc-select {
    @include mdc-select-ink-color(#20123a);
    @include mdc-select-focused-label-color(#20123a);
    @include mdc-select-bottom-line-color(#20123a);
    @include mdc-select-focused-bottom-line-color(#312a65);
    @include mdc-select-focused-outline-color(#312a65);

    &.mdc-select--focused .mdc-select__dropdown-icon {
      filter: brightness(0) saturate(100%) invert(10%) sepia(43%)
        saturate(1233%) hue-rotate(225deg) brightness(97%) contrast(105%);
    }
  }
}
</style>

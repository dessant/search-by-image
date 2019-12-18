<template>
  <div id="app" v-if="dataLoaded">
    <div class="section">
      <div class="section-title" v-once>
        {{ getText('optionSectionTitle_engines') }}
      </div>
      <div class="section-desc" v-once>
        {{ getText('optionSectionDescription_engines') }}
      </div>
      <v-draggable class="option-wrap" :list="options.engines">
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
        <div class="option select">
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
        {{ getText('optionSectionTitle_toolbar') }}
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
        <div class="option select">
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
        <div class="option">
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
import {getText, isAndroid} from 'utils/common';
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

  data: function() {
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
          {
            searchModeContextMenu: ['select', 'selectUpload', 'capture']
          },
          {scope: 'optionValue_searchModeContextMenu'}
        ),
        ...getListItems(
          {searchAllEnginesAction: ['main', 'sub', 'false']},
          {scope: 'optionValue_searchAllEnginesAction'}
        ),
        ...getListItems(
          {
            searchModeAction: [
              'select',
              'selectUpload',
              'capture',
              'upload',
              'url'
            ]
          },
          {scope: 'optionValue_searchModeAction'}
        )
      },
      contextMenuEnabled: true,

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
        searchModeContextMenu: ''
      }
    };
  },

  methods: {
    getText,

    engineEnabled: function(engine) {
      return !includes(this.options.disabledEngines, engine);
    },

    setEngineState: async function(engine, enabled) {
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

  created: async function() {
    const options = await storage.get(optionKeys, 'sync');

    for (const option of Object.keys(this.options)) {
      this.options[option] = options[option];
      this.$watch(`options.${option}`, async function(value) {
        await storage.set({[option]: value}, 'sync');
      });
    }

    if (targetEnv === 'firefox' && (await isAndroid())) {
      this.contextMenuEnabled = false;
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
</style>

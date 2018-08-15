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
        <v-form-field :input-id="engine"
            :label="getText(`optionTitle_${engine}`)">
          <v-checkbox :id="engine" :checked="engineEnabled(engine)"
              @change="setEngineState(engine, $event)">
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
        <v-form-field input-id="sic"
            :label="getText('optionTitle_showInContextMenu')">
          <v-switch id="sic" v-model="options.showInContextMenu"></v-switch>
        </v-form-field>
      </div>
      <div class="option select">
        <v-select :label="getText('optionTitle_searchMode')"
            v-model="options.searchModeContextMenu"
            :options="selectOptions.searchModeContextMenu">
        </v-select>
      </div>
      <div class="option select">
        <v-select :label="getText('optionTitle_searchAllEngines')"
            v-model="options.searchAllEnginesContextMenu"
            :options="selectOptions.searchAllEnginesContextMenu">
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
        <v-select :label="getText('optionTitle_searchMode')"
            v-model="options.searchModeAction"
            :options="selectOptions.searchModeAction">
        </v-select>
      </div>
      <div class="option select">
        <v-select :label="getText('optionTitle_searchAllEngines')"
            v-model="options.searchAllEnginesAction"
            :options="selectOptions.searchAllEnginesAction">
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
        <v-form-field input-id="tib"
            :label="getText('optionTitle_tabInBackgound')">
          <v-switch id="tib" v-model="options.tabInBackgound"></v-switch>
        </v-form-field>
      </div>
      <div class="option">
        <v-form-field input-id="ifp"
            :label="getText('optionTitle_imgFullParse')">
          <v-switch id="ifp" v-model="options.imgFullParse"></v-switch>
        </v-form-field>
      </div>
      <div class="option">
        <v-form-field input-id="lg"
            :label="getText('optionTitle_localGoogle')">
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
import {getOptionLabels} from 'utils/app';
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

      selectOptions: getOptionLabels({
        searchAllEnginesContextMenu: ['main', 'sub', 'false'],
        searchModeContextMenu: ['select', 'selectUpload'],
        searchAllEnginesAction: ['main', 'sub', 'false'],
        searchModeAction: ['select', 'selectUpload', 'upload', 'url']
      }),
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

@import '@material/theme/mixins';
@import '@material/typography/mixins';

body {
  @include mdc-typography-base;
  font-size: 100%;
  background-color: #ffffff;
  overflow: visible !important;
}

.mdc-select__menu {
  top: inherit !important;
  left: inherit !important;
}

.mdc-checkbox {
  margin-left: 8px;
}

.mdc-switch {
  margin-right: 12px;
}

#app {
  display: grid;
  grid-row-gap: 32px;
  padding: 12px;
}

.section-title,
.section-desc {
  @include mdc-theme-prop('color', 'text-primary-on-light');
}

.section-title {
  @include mdc-typography('title');
}

.section-desc {
  @include mdc-typography('body1');
  padding-top: 8px;
}

.option-wrap {
  display: grid;
  grid-row-gap: 12px;
  padding-top: 16px;
  grid-auto-columns: min-content;
}

.option {
  display: flex;
  align-items: center;
  height: 36px;
}

.option.select {
  height: 56px;
}
</style>

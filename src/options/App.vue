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
            :label="getText(`engineName_${engine}_full`)">
          <v-checkbox :id="engine" :checked="engineEnabled(engine)"
              @change="setEngineState(engine, $event)">
          </v-checkbox>
        </v-form-field>
      </div>
    </v-draggable>
  </div>

  <div class="section">
    <div class="section-title" v-once>
      {{ getText('optionSectionTitle_misc') }}
    </div>
    <div class="option-wrap">
      <div class="option">
        <v-select v-model="options.searchAllEnginesContextMenu"
            :options="selectOptions.searchAllEnginesContextMenu">
        </v-select>
      </div>
      <div class="option">
        <v-form-field input-id="tib"
            :label="getText('optionTitle_tabInBackgound')">
          <v-switch id="tib" v-model="options.tabInBackgound"></v-switch>
        </v-form-field>
      </div>
      <div class="option">
        <v-form-field input-id="lg"
            :label="getText('optionTitle_localGoogle')">
          <v-switch id="lg" v-model="options.localGoogle"></v-switch>
        </v-form-field>
      </div>
      <div class="option">
        <v-form-field input-id="ifp"
            :label="getText('optionTitle_imgFullParse')">
          <v-switch id="ifp" v-model="options.imgFullParse"></v-switch>
        </v-form-field>
      </div>
    </div>
  </div>

</div>
</template>

<script>
import browser from 'webextension-polyfill';
import _ from 'lodash';
import draggable from 'vuedraggable';

import storage from 'storage/storage';
import {getText} from 'utils/common';
import {optionKeys} from 'utils/data';

import Checkbox from './components/Checkbox';
import Switch from './components/Switch';
import Select from './components/Select';
import FormField from './components/FormField';

export default {
  components: {
    'v-draggable': draggable,
    [Checkbox.name]: Checkbox,
    [Switch.name]: Switch,
    [Select.name]: Select,
    [FormField.name]: FormField
  },

  data: function() {
    const data = {
      dataLoaded: false,

      options: {
        engines: [],
        disabledEngines: [],
        searchAllEnginesContextMenu: '',
        tabInBackgound: false,
        localGoogle: false,
        imgFullParse: false
      }
    };

    const selectOptionsData = {
      searchAllEnginesContextMenu: ['main', 'sub', 'false']
    };
    const selectOptions = {};
    for (const [option, values] of Object.entries(selectOptionsData)) {
      selectOptions[option] = [];
      values.forEach(function(value) {
        selectOptions[option].push({
          id: value,
          label: getText(`optionValue_${option}_${value}`)
        });
      });
    }
    data.selectOptions = selectOptions;

    return data;
  },

  methods: {
    getText: getText,

    engineEnabled: function(engine) {
      return !_.includes(this.options.disabledEngines, engine);
    },

    setEngineState: async function(engine, enabled) {
      if (enabled) {
        this.options.disabledEngines = _.without(
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

    this.dataLoaded = true;
  }
};
</script>

<style lang="scss">
$mdc-theme-primary: #1abc9c;

@import '@material/theme/mdc-theme';
@import '@material/typography/mdc-typography';

.mdc-checkbox {
  margin-left: 8px;
}

.mdc-switch {
  margin-right: 12px;
}

body {
  min-width: 600px;
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
}

.option {
  display: flex;
  align-items: center;
  height: 36px;
}
</style>

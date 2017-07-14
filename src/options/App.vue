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
        <v-checkbox :id="engine" :checked="engineEnabled(engine)"
            @change="setEngineState(engine, $event)">
        </v-checkbox>
        <label class="option-title" :for="engine">
          {{ getText(`engineName_${engine}_full`) }}
        </label>
      </div>
    </v-draggable>
  </div>

  <div class="section">
    <div class="section-title" v-once>
      {{ getText('optionSectionTitle_misc') }}
    </div>
    <div class="option-wrap">
      <div class="option" v-for="option in miscOptionKeys" :key="option.id">
        <v-switch :id="option" v-model="options[option]"></v-switch>
        <span class="option-title"
            @click="options[option] = !options[option]" v-once>
          {{ getText(`optionTitle_${option}`) }}
        </span>
        <v-select v-if="option === 'searchAllEngines'"
            v-show="options.searchAllEngines"
            v-model="options.searchAllEnginesLocation"
            :options="searchAllEnginesLocationOptions">
        </v-select>
      </div>
    </div>
  </div>

</div>
</template>

<script>
import _ from 'lodash';
import draggable from 'vuedraggable';

import storage from 'storage/storage';
import {getText} from 'utils/common';
import {optionKeys} from 'utils/data';

import Checkbox from './components/Checkbox';
import Switch from './components/Switch';
import Select from './components/Select';

export default {
  components: {
    'v-draggable': draggable,
    [Checkbox.name]: Checkbox,
    [Switch.name]: Switch,
    [Select.name]: Select
  },

  data: function() {
    return {
      dataLoaded: false,

      miscOptionKeys: [
        'searchAllEngines',
        'tabInBackgound',
        'localGoogle',
        'imgFullParse'
      ],
      searchAllEnginesLocationOptions: [
        {
          id: 'menu',
          label: getText('optionValue_searchAllEnginesLocation_menu')
        },
        {
          id: 'submenu',
          label: getText('optionValue_searchAllEnginesLocation_submenu')
        }
      ],

      options: {
        engines: [],
        disabledEngines: [],
        searchAllEngines: false,
        searchAllEnginesLocation: '',
        tabInBackgound: false,
        localGoogle: false,
        imgFullParse: false
      }
    };
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
    var options = await storage.get(optionKeys, 'sync');

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
.mdc-select {
  width: 180px !important;
}

.mdc-select__menu {
  width: 204px !important;
}

.mdc-select__selected-text,
.mdc-select .mdc-list-item {
  letter-spacing: normal !important;
  font-size: 20px !important;
  color: #444 !important;
}

.mdc-checkbox {
  margin-left: 12px;
  margin-right: 12px;
}

.mdc-switch {
  margin-left: 8px;
  margin-right: 24px;
}

.section-desc,
.section-title,
.option-title {
  color: #444;
  font-family: Roboto, sans-serif;
}

.section-title {
  font-size: 28px;
  padding-top: 24px;
}

.section-desc {
  opacity: 0.7;
  font-size: 16px;
  padding-top: 8px;
}

.option-wrap {
  display: grid;
  grid-row-gap: 16px;
  padding-top: 24px;
  padding-bottom: 24px;
}

.option {
  display: flex;
  align-items: center;
  height: 32px;
}

.option-title {
  font-size: 20px;
  padding-right: 8px;
}
</style>

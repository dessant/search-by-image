<template>
<div id="app" v-if="dataLoaded">
  <div class="section">
    <div class="section-title" v-once>
      {{ getText('optionSectionTitle:engines') }}
    </div>
    <div class="section-desc" v-once>
      {{ getText('optionSectionDescription:engines') }}
    </div>
    <draggable class="option-wrap" :list="options.engines">
      <div class="option" v-for="engine in options.engines" :key="engine.id">
        <v-checkbox :id="engine" :checked="engineEnabled(engine)"
            @change="setEngineState(engine, $event)">
        </v-checkbox>
        <label class="option-title" :for="engine">
          {{ getText(`engineName:${engine}:full`) }}
        </label>
      </div>
    </draggable>
  </div>

  <div class="section">
    <div class="section-title" v-once>
      {{ getText('optionSectionTitle:misc') }}
    </div>
    <div class="option-wrap">
      <div class="option">
        <v-switch id="sae" v-model="options.searchAllEngines"></v-switch>
        <label class="option-title" for="sae" v-once
            @click="options.searchAllEngines = !options.searchAllEngines">
          {{ getText('optionTitle:searchAllEngines') }}
        </label>
        <v-select v-show="options.searchAllEngines"
            v-model="options.searchAllEnginesLocation"
            :options="searchAllEnginesLocationOptions">
        </v-select>
      </div>
      <div class="option">
        <v-switch id="tib" v-model="options.tabInBackgound"></v-switch>
        <label class="option-title" for="tib" v-once
            @click="options.tabInBackgound = !options.tabInBackgound">
          {{ getText('optionTitle:tabInBackgound') }}
        </label>
      </div>
      <div class="option">
        <v-switch id="lg" v-model="options.localGoogle"></v-switch>
        <label class="option-title" for="lg" v-once
            @click="options.localGoogle = !options.localGoogle">
          {{ getText('optionTitle:localGoogle') }}
        </label>
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
    draggable,
    [Checkbox.name]: Checkbox,
    [Switch.name]: Switch,
    [Select.name]: Select
  },

  data: function() {
    return {
      dataLoaded: false,
      searchAllEnginesLocationOptions: [],
      options: {
        engines: [],
        disabledEngines: [],
        searchAllEngines: false,
        searchAllEnginesLocation: '',
        tabInBackgound: false,
        localGoogle: false
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
      this.$watch(`options.${option}`, function(value) {
        storage.set({[option]: value}, 'sync');
      });
    }

    this.searchAllEnginesLocationOptions = [
      {id: 'menu', label: getText('optionValue:searchAllEnginesLocation:menu')},
      {
        id: 'submenu',
        label: getText('optionValue:searchAllEnginesLocation:submenu')
      }
    ];

    this.dataLoaded = true;
  }
};
</script>

<style lang="scss" scoped>
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
  font-family: sans-serif;
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

<template>
<div id="app" v-if="dataLoaded">
  <div class="section">
    <div class="section-title" v-once>{{ getText('optionSectionTitle:engines') }}</div>
    <div class="section-desc" v-once>{{ getText('optionSectionDescription:engines') }}</div>
      <draggable class="option-wrap" :list="options.engines">
        <div class="option" v-for="engine in options.engines" :key="engine.id">
          <input type="checkbox" :id="engine" :checked="engineEnabled(engine)" @change="setEngineState(engine, $event)">
          <label class="option-title" :for="engine">{{ getText(`engineName:${engine}:full`) }}</label>
        </div>
    </draggable>
  </div>

  <div class="section">
    <div class="section-title" v-once>{{ getText('optionSectionTitle:misc') }}</div>
    <div class="option-wrap">
      <div class="option">
        <input type="checkbox" id="sae" v-model="options.searchAllEngines">
        <label class="option-title" for="sae" v-once>{{ getText('optionTitle:searchAllEngines') }}</label>
        <select v-show="options.searchAllEngines" v-model="options.searchAllEnginesLocation">
          <option value="submenu" v-once>{{ getText('optionValue:searchAllEnginesLocation:submenu') }}</option>
          <option value="menu" v-once>{{ getText('optionValue:searchAllEnginesLocation:menu') }}</option>
        </select>
      </div>
      <div class="option">
        <input type="checkbox" id="tib" v-model="options.tabInBackgound">
        <label class="option-title" for="tib" v-once>{{ getText('optionTitle:tabInBackgound') }}</label>
      </div>
      <div class="option">
        <input type="checkbox" id="lg" v-model="options.localGoogle">
        <label class="option-title" for="lg" v-once>{{ getText('optionTitle:localGoogle') }}</label>
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

export default {
  components: {
    draggable
  },

  data: function() {
    return {
      dataLoaded: false,
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

    setEngineState: async function(engine, e) {
      if (e.target.checked) {
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

    this.dataLoaded = true;
  }
};
</script>

<style lang="scss" scoped>
.section-desc,
.section-title,
.option-title,
option,
select {
  color: #444;
}

option,
select {
  font-size: 16px;
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
  padding-left: 12px;
  padding-right: 8px;
}
</style>

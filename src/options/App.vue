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
      <div class="option" v-for="option in miscOptionKeys" :key="option.id">
        <v-form-field :input-id="option"
            :label="getText(`optionTitle_${option}`)">
          <v-switch :id="option" v-model="options[option]"></v-switch>
        </v-form-field>
        <v-select class="inline-select"
            v-if="option === 'searchAllEngines'"
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
$mdc-theme-primary: #1abc9c;

@import '@material/theme/mdc-theme';
@import '@material/typography/mdc-typography';

.mdc-checkbox {
  margin-left: 8px;
}

.mdc-switch {
  margin-right: 12px;
}

#app {
  display: grid;
  grid-row-gap: 32px;
  min-width: 600px;
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

.inline-select {
  margin-left: 6px;
  margin-right: 6px;
}
</style>

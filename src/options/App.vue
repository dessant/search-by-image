<template>
  <div id="app" v-if="dataLoaded" :class="appClasses">
    <div class="section-engines">
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

    <div class="section-toolbar">
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

    <div class="section-misc">
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

    <div class="section-placeholder"></div>
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

  computed: {
    appClasses: function () {
      return {
        'feature-context-menu': this.contextMenuEnabled
      };
    }
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
    const options = await storage.get(optionKeys);

    for (const option of Object.keys(this.options)) {
      this.options[option] = options[option];
      this.$watch(`options.${option}`, async function (value) {
        await storage.set({[option]: value});
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
  grid-column-gap: 48px;
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

.samsung {
  & .section-title,
  & .section-desc,
  & .mdc-form-field,
  & .mdc-list-item {
    @include mdc-theme-prop(color, #252525);
  }

  & .mdc-checkbox {
    @include mdc-checkbox-container-colors(
      #8188e9,
      #00000000,
      #8188e9,
      #8188e9
    );
    @include mdc-checkbox-focus-indicator-color(#8188e9);
  }

  & .mdc-switch {
    @include mdc-switch-toggled-on-color(#8188e9);
  }

  & .mdc-select {
    @include mdc-select-ink-color(#252525);
    @include mdc-select-focused-label-color(#252525);
    @include mdc-select-bottom-line-color(#4e5bb6);
    @include mdc-select-focused-bottom-line-color(#8188e9);
    @include mdc-select-focused-outline-color(#8188e9);

    & .mdc-select__dropdown-icon {
      background: url('data:image/svg+xml,%3Csvg%20width%3D%2210px%22%20height%3D%225px%22%20viewBox%3D%227%2010%2010%205%22%20version%3D%221.1%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%3E%0A%20%20%20%20%3Cpolygon%20id%3D%22Shape%22%20stroke%3D%22none%22%20fill%3D%22%23454545%22%20fill-rule%3D%22evenodd%22%20opacity%3D%221%22%20points%3D%227%2010%2012%2015%2017%2010%22%3E%3C%2Fpolygon%3E%0A%3C%2Fsvg%3E')
        no-repeat center !important;
    }
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

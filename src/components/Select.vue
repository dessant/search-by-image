<template>
<div class="mdc-select" role="listbox" tabindex="0">
  <slot name="selection" :selection="value">
    <span class="mdc-select__selected-text"></span>
  </slot>
  <div class="mdc-simple-menu mdc-select__menu">
    <ul class="mdc-list mdc-simple-menu__items">
      <slot name="options" :selection="value" :options="options">
        <li class="mdc-list-item" role="option" tabindex="0"
            v-for="option in options"
            :key="option.id"
            :id="option.id"
            :aria-selected="value === option.id">
          {{ option.label }}
        </li>
      </slot>
    </ul>
  </div>
</div>
</template>

<script>
import {MDCSelect} from '@material/select';

export default {
  name: 'v-select',

  model: {
    prop: 'value',
    event: 'change'
  },

  props: {
    options: {
      required: true
    },
    value: {
      type: String,
      required: true
    }
  },

  methods: {
    onChange: function() {
      this.$emit('change', this.select.value);
    }
  },

  mounted: function() {
    this.select = new MDCSelect(this.$el);
    this.select.listen('MDCSelect:change', this.onChange);
  }
};
</script>

<style lang="scss">
$mdc-theme-primary: #1abc9c;

@import '@material/select/mdc-select';
@import '@material/list/mdc-list';
@import '@material/menu/mdc-menu';
</style>

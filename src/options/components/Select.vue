<template>
<div class="mdc-select" role="listbox" tabindex="0">
  <span class="mdc-select__selected-text"></span>
  <div class="mdc-simple-menu mdc-select__menu">
    <ul class="mdc-list mdc-simple-menu__items">
      <li class="mdc-list-item" role="option" tabindex="0"
          v-for="option in options"
          :key="option.id"
          :id="option.id"
          :aria-selected="value === option.id">
        {{option.label}}
      </li>
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
    this.select = new MDCSelect(document.querySelector('.mdc-select'));
    this.select.listen('MDCSelect:change', this.onChange);
  }
};
</script>

<style lang="scss" scoped>
$mdc-theme-primary: #1abc9c;

@import '@material/select/mdc-select';
@import '@material/list/mdc-list';
@import '@material/menu/mdc-menu';

.mdc-select {
  width: 160px !important;
}

.mdc-select__menu {
  width: 184px !important;
}

.mdc-select__selected-text,
.mdc-select .mdc-list-item {
  font-family: sans-serif !important;
  letter-spacing: normal !important;
  font-size: 20px !important;
  color: #444 !important;
}
</style>

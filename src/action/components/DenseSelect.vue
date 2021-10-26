<template>
  <div class="mdc-select mdc-select--no-label">
    <div class="mdc-select__anchor">
      <i class="mdc-select__dropdown-icon"></i>
      <div class="mdc-select__selected-text"></div>
      <div class="mdc-line-ripple"></div>
    </div>

    <div class="mdc-select__menu mdc-menu mdc-menu-surface">
      <ul class="mdc-list">
        <li
          class="mdc-list-item"
          v-for="option of options"
          :key="option.id"
          :data-value="option.id"
          :aria-selected="option.id === value"
        >
          {{ option.label }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import {MDCSelect} from '@material/select';

export default {
  name: 'v-dense-select',

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
      required: false
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },

  watch: {
    value: function () {
      if (this.select) {
        this.setValue();
      }
    },
    disabled: function () {
      if (this.select) {
        this.setDisabled();
      }
    }
  },

  methods: {
    onChange: function () {
      this.$emit('change', this.select.value);
    },

    setDisabled: function () {
      this.select.disabled = this.disabled;
    },

    setValue: function () {
      if (!this.value) {
        this.select.selectedIndex = -1;
      } else {
        for (const [index, option] of this.options.entries()) {
          if (option.id === this.value) {
            this.select.selectedIndex = index;
            break;
          }
        }
      }
    }
  },

  mounted: function () {
    this.select = new MDCSelect(this.$el);
    this.select.listen('MDCSelect:change', this.onChange);

    this.setDisabled();
    this.setValue();
  }
};
</script>

<style lang="scss">
$mdc-theme-primary: #1abc9c;

@import '@material/list/mdc-list';
@import '@material/menu-surface/mdc-menu-surface';
@import '@material/menu/mdc-menu';
@import '@material/select/mdc-select';

.mdc-list-item {
  white-space: nowrap;
  padding-right: 32px !important;
}

div.mdc-select.mdc-select--no-label {
  @include mdc-select-container-fill-color(#00000000);
  @include mdc-select-bottom-line-color(#00000000);
  @include mdc-select-focused-bottom-line-color(#00000000);

  & .mdc-select__anchor {
    height: auto !important;
    align-items: center !important;

    &::before {
      background-color: transparent;
    }
  }

  & .mdc-select__selected-text {
    min-width: auto !important;
    height: auto;

    padding-top: 0 !important;
    padding-bottom: 0 !important;
    padding-left: 2px !important;
    padding-right: 36px !important;
  }

  & .mdc-select__dropdown-icon {
    top: 50% !important;
    transform: translateY(-50%);
  }

  &.mdc-select--activated .mdc-select__dropdown-icon {
    transform: rotate(180deg) translateY(50%);
  }
}
</style>

<template>
<button class="mdc-button"
    :class="classes"
    :disabled="disabled"
    @click="$emit('click')">
  <slot></slot>
</button>
</template>

<script>
import {MDCRipple} from '@material/ripple';

export default {
  name: 'v-button',
  props: {
    disabled: {
      type: Boolean,
      default: false
    },
    raised: {
      type: Boolean,
      default: false
    },
    unelevated: {
      type: Boolean,
      default: false
    },
    stroked: {
      type: Boolean,
      default: false
    },
    dense: {
      type: Boolean,
      default: false
    },
    compact: {
      type: Boolean,
      default: false
    },
    ripple: {
      type: Boolean,
      default: true
    }
  },

  data: function() {
    return {
      classes: {
        'mdc-button--raised': this.raised,
        'mdc-button--unelevated': this.unelevated,
        'mdc-button--stroked': this.stroked,
        'mdc-button--dense': this.dense,
        'mdc-button--compact': this.compact
      }
    };
  },

  mounted: function() {
    if (this.ripple) {
      MDCRipple.attachTo(this.$el);
    }
  }
};
</script>

<style lang="scss">
$mdc-theme-primary: #1abc9c;

@import '@material/button/mdc-button';
</style>

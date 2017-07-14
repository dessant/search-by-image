<template>
<button class="mdc-button"
    :class="classes"
    :disabled="disabled"
    @click="$emit('click')">
  <slot></slot>
</button>
</template>

<script>
export default {
  name: 'v-button',
  props: {
    disabled: {
      type: Boolean,
      default: false
    },
    primary: {
      type: Boolean,
      default: false
    },
    accent: {
      type: Boolean,
      default: false
    },
    dense: {
      type: Boolean,
      default: false
    },
    raised: {
      type: Boolean,
      default: false
    },
    compact: {
      type: Boolean,
      default: false
    }
  },

  data: function() {
    return {
      classes: {
        'mdc-button--primary': this.primary,
        'mdc-button--accent': this.accent,
        'mdc-button--dense': this.dense,
        'mdc-button--raised': this.raised,
        'mdc-button--compact': this.compact
      }
    };
  }
};
</script>

<style lang="scss">
$mdc-theme-primary: #1abc9c;

@import '@material/button/mdc-button';
</style>

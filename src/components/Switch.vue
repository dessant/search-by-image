<template>
<div class="mdc-switch" :class="switchClasses">
  <input type="checkbox" class="mdc-switch__native-control"
      :checked="checked"
      :id="`${id}__native`"
      @change="$emit('change', $event.target.checked)">
  <div class="mdc-switch__background">
    <div class="mdc-switch__knob"></div>
  </div>
</div>
</template>

<script>
export default {
  name: 'v-switch',

  computed: {
    switchClasses: function() {
      return {
        'mdc-switch--disabled': this.disabled
      };
    }
  },

  model: {
    prop: 'checked',
    event: 'change'
  },

  props: {
    id: {
      type: String,
      required: true
    },
    checked: {
      type: Boolean
    },
    disabled: {
      type: Boolean,
      default: false
    }
  }
};
</script>

<style lang="scss">
$mdc-theme-primary: #1abc9c;

@import '@material/switch/mdc-switch';
</style>

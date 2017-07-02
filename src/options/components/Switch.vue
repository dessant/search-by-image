<template>
<div class="mdc-switch">
  <input type="checkbox" id="basic-switch" class="mdc-switch__native-control"
      :checked="checked"
      :id="id"
      @change="$emit('change', $event.target.checked)">
  <div class="mdc-switch__background">
    <div class="mdc-switch__knob"></div>
  </div>
</div>
</template>

<script>
export default {
  name: 'v-switch',
  model: {
    prop: 'checked',
    event: 'change'
  },

  props: {
    checked: Boolean,
    id: String
  }
};
</script>

<style lang="scss" scoped>
$mdc-theme-primary: #1abc9c;

@import '@material/switch/mdc-switch';
</style>

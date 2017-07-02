<template>
<div class="mdc-checkbox">
  <input type="checkbox" class="mdc-checkbox__native-control"
      :checked="checked"
      :id="id"
      @change="$emit('change', $event.target.checked)">
  <div class="mdc-checkbox__background">
  <svg class="mdc-checkbox__checkmark" viewBox="0 0 24 24">
    <path class="mdc-checkbox__checkmark__path"
        fill="none"
        stroke="white"
        d="M1.73,12.91 8.1,19.28 22.79,4.59"/>
    </svg>
    <div class="mdc-checkbox__mixedmark"></div>
  </div>
</div>
</template>

<script>
export default {
  name: 'v-checkbox',
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

@import '@material/checkbox/mdc-checkbox';
</style>

<template>
<div class="mdc-form-field" :class="formFieldClasses">
  <slot></slot>
  <label :for="`${inputId}__native`">{{ label }}</label>
</div>
</template>

<script>
import {MDCFormField} from '@material/form-field';

export default {
  name: 'v-form-field',

  props: {
    label: {
      type: String,
      required: true
    },
    inputId: {
      type: String,
      required: true
    },
    alignEnd: {
      type: Boolean,
      default: false
    }
  },

  data: function() {
    return {
      mdcFormField: null
    };
  },

  computed: {
    formFieldClasses: function() {
      return {
        'mdc-form-field--align-end': this.alignEnd
      };
    }
  },

  methods: {
    onInputMounted: function(data) {
      this.mdcFormField.input = data;
    }
  },

  created: function() {
    this.$on('input-mounted', this.onInputMounted);
  },

  mounted: function() {
    this.mdcFormField = new MDCFormField(this.$el);
  }
};
</script>

<style lang="scss">
$mdc-theme-primary: #1abc9c;

@import '@material/form-field/mdc-form-field';
</style>

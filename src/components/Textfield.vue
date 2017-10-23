<template>
<div ref="root" class="mdc-textfield" :class="textfieldClasses">
  <textarea v-if="multiline"
      :id="`${id}__textarea-native`"
      ref="textarea"
      class="mdc-textfield__input"
      :value="value"
      @focus="onFocus"
      @blur="onBlur"
      @input="onInput"
      :placeholder="placeholder"
      :rows="rows"
      :cols="cols">
  </textarea>

  <input v-else
      class="mdc-textfield__input"
      ref="input"
      :id="`${id}__input-native`"
      type="text"
      :value="value"
      @focus="onFocus"
      @blur="onBlur"
      @input="onInput"
      :placeholder="placeholder"
      :aria-label="placeholder" required>
  <label v-if="label && !fullwidth" :for="`${id}__input-native`"
      class="mdc-textfield__label">
    {{ label }}
  </label>
</div>
</template>

<script>
import {MDCTextfield} from '@material/textfield';

export default {
  name: 'v-textfield',

  props: {
    id: String,
    label: {
      type: String,
      required: false
    },
    placeholder: {
      type: String,
      required: false
    },
    value: {
      type: String,
      required: false
    },
    multiline: {
      type: Boolean,
      required: false
    },
    fullwidth: {
      type: Boolean,
      required: false
    },
    rows: {
      type: Number,
      required: false
    },
    cols: {
      type: Number,
      required: false
    }
  },

  data: function() {
    return {
      textfield: null
    };
  },

  methods: {
    onFocus: function() {
      this.$emit('focus');
    },

    onBlur: function() {
      this.$emit('blur');
    },

    onInput: function(event) {
      this.$emit('input', event.target.value);
    }
  },

  computed: {
    textfieldClasses: function() {
      return {
        'mdc-textfield--multiline': this.multiline,
        'mdc-textfield--fullwidth': this.fullwidth
      };
    }
  },

  mounted: function() {
    this.textfield = new MDCTextfield(this.$refs.root);
  }
};
</script>

<style lang="scss">
$mdc-theme-primary: #1abc9c;

@import '@material/textfield/mdc-textfield';

.mdc-textfield__input {
  font-size: 1rem;
}
</style>

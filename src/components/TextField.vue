<template>
<div ref="root" class="mdc-text-field" :class="textFieldClasses">
  <textarea v-if="multiline"
      :id="`${id}__textarea-native`"
      ref="textarea"
      class="mdc-text-field__input"
      :value="value"
      @focus="onFocus"
      @blur="onBlur"
      @input="onInput"
      :placeholder="placeholder"
      :rows="rows"
      :cols="cols">
  </textarea>

  <input v-else
      class="mdc-text-field__input"
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
      class="mdc-text-field__label">
    {{ label }}
  </label>
</div>
</template>

<script>
import {MDCTextField} from '@material/textfield';

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
      textField: null
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
    textFieldClasses: function() {
      return {
        'mdc-text-field--multiline': this.multiline,
        'mdc-text-field--fullwidth': this.fullwidth
      };
    }
  },

  mounted: function() {
    this.textField = new MDCTextField(this.$refs.root);
  }
};
</script>

<style lang="scss">
$mdc-theme-primary: #1abc9c;

@import '@material/textfield/mdc-text-field';

.mdc-text-field__input {
  font-size: 1rem;
}
</style>

<template>
<div role="progressbar" class="mdc-linear-progress" :class="classes">
  <div class="mdc-linear-progress__buffering-dots"></div>
  <div class="mdc-linear-progress__buffer"></div>
  <div class="mdc-linear-progress__bar mdc-linear-progress__primary-bar">
    <span class="mdc-linear-progress__bar-inner"></span>
  </div>
  <div class="mdc-linear-progress__bar mdc-linear-progress__secondary-bar">
    <span class="mdc-linear-progress__bar-inner"></span>
  </div>
</div>
</template>

<script>
import {MDCLinearProgress} from '@material/linear-progress';

export default {
  name: 'v-linear-progress',
  props: {
    indeterminate: {
      type: Boolean,
      default: false
    },
    reversed: {
      type: Boolean,
      default: false
    },
    progress: {
      type: Number,
      default: 0
    },
    buffer: {
      type: Number,
      default: 1
    }
  },

  data: function() {
    return {
      bar: null,

      classes: {
        'mdc-linear-progress--indeterminate': this.indeterminate,
        'mdc-linear-progress--reversed': this.reversed
      }
    };
  },

  mounted: function() {
    this.bar = new MDCLinearProgress(this.$el);
    this.bar.progress = this.progress;
    this.bar.buffer = this.buffer;
  },

  watch: {
    progress: function(value) {
      if (this.bar) {
        this.bar.progress = value;
      }
    },
    buffer: function(value) {
      if (this.bar) {
        this.bar.buffer = value;
      }
    }
  }
};
</script>

<style lang="scss">
$mdc-theme-primary: #1abc9c;

@import '@material/linear-progress/mdc-linear-progress';
</style>

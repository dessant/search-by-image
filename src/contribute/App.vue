<template>
<div id="app">
  <v-contribute :extName="extName" :extSlug="extSlug" :notice="notice">
  </v-contribute>
</div>
</template>

<script>
import {Contribute} from 'ext-contribute';

import {getText} from 'utils/common';

export default {
  components: {
    [Contribute.name]: Contribute
  },

  data: function() {
    return {
      extName: getText('extensionName'),
      extSlug: 'search-by-image',
      notice: ''
    };
  },

  created: function() {
    document.title = getText('pageTitle', [
      getText('pageTitle_contribute'),
      this.extName
    ]);

    const query = new URL(window.location.href).searchParams;
    if (query.get('action') === 'search') {
      this.notice = `This page is shown during your 10th and 100th search,
        the search results can be found next to the current tab.`;
    }
  }
};
</script>

<style lang="scss">
@import '@material/typography/mixins';

body {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  @include mdc-typography-base;
  font-size: 100%;
  background-color: #ffffff;
}
</style>

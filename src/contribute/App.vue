<template>
  <vn-app>
    <vn-contribute
      :extName="extName"
      :extSlug="extSlug"
      :notice="notice"
      :theme="theme"
      @open="showPage"
    >
    </vn-contribute>
  </vn-app>
</template>

<script>
import {App} from 'vueton';
import {Contribute} from 'vueton/components/contribute';

import {showPage, getAppTheme} from 'utils/app';
import {getText} from 'utils/common';

export default {
  components: {
    [App.name]: App,
    [Contribute.name]: Contribute
  },

  data: function () {
    return {
      extName: getText('extensionName'),
      extSlug: 'search-by-image',
      notice: '',
      theme: ''
    };
  },

  methods: {
    setup: async function () {
      const query = new URL(window.location.href).searchParams;
      if (query.get('action') === 'auto') {
        this.notice = `This page is shown once a year while using the extension,
        the search results can be found in the next tab.`;
      }

      this.theme = await getAppTheme();
      document.addEventListener('themeChange', ev => {
        this.theme = ev.detail;
      });
    },

    showPage
  },

  created: function () {
    document.title = getText('pageTitle', [
      getText('pageTitle_contribute'),
      this.extName
    ]);

    this.setup();
  }
};
</script>

<style lang="scss">
@use 'vueton/styles' as vueton;

@include vueton.theme-base;

.v-application__wrap {
  display: flex;
  align-items: center;
}
</style>

<template>
  <vn-app v-show="dataLoaded">
    <div class="grid" v-if="results.length">
      <div
        class="grid-item"
        tabindex="0"
        @keyup.enter="openPage(index)"
        :class="resultClasses"
        v-for="(item, index) in results"
        :key="index"
      >
        <div
          class="grid-item-image-wrap"
          :title="getText('buttonTooltip_viewPage')"
          @click="openPage(index)"
        >
          <img class="grid-item-image" :src="item.image" />
        </div>
        <div class="grid-item-footer">
          <div class="grid-item-footer-text" :title="item.text">
            {{ item.text }}
          </div>
          <vn-icon-button
            class="grid-item-footer-button"
            src="/src/assets/icons/misc/image.svg"
            :title="getText('buttonTooltip_viewImage')"
            @click="openImage(index)"
          ></vn-icon-button>
        </div>
      </div>
    </div>
    <div v-if="!resultsLoaded" class="page-overlay">
      <div class="error-content" v-if="error">
        <vn-icon
          class="error-icon"
          src="/src/assets/icons/misc/error.svg"
        ></vn-icon>
        <div class="error-text">{{ error }}</div>
      </div>

      <img
        v-if="showSpinner && !error"
        class="spinner"
        src="/src/assets/icons/misc/spinner.svg"
      />
    </div>
  </vn-app>
</template>

<script>
import Masonry from 'masonry-layout';
import imagesLoaded from 'imagesloaded';
import {App, Icon, IconButton} from 'vueton';

import {validateUrl, sendLargeMessage, showPage} from 'utils/app';
import {getText} from 'utils/common';
import {
  prepareImageForUpload,
  searchGoogle,
  searchGoogleLens,
  searchPinterest
} from 'utils/engines';

export default {
  components: {
    [App.name]: App,
    [Icon.name]: Icon,
    [IconButton.name]: IconButton
  },

  data: function () {
    return {
      dataLoaded: false,

      error: '',
      showSpinner: false,
      engine: '',
      results: [],
      resultsLoaded: false
    };
  },

  computed: {
    resultClasses: function () {
      return {
        'grid-item-loaded': this.resultsLoaded
      };
    }
  },

  methods: {
    getText,

    setup: async function () {
      const storageId = new URL(window.location.href).searchParams.get('id');

      const task = await browser.runtime.sendMessage({
        id: 'storageRequest',
        asyncResponse: true,
        saveReceipt: true,
        storageId
      });

      if (task) {
        this.showSpinner = true;
        this.dataLoaded = true;

        try {
          this.engine = task.search.engine;

          document.title = getText('pageTitle', [
            getText(`optionTitle_${this.engine}`),
            getText('extensionName')
          ]);

          let image = await sendLargeMessage({
            message: {
              id: 'storageRequest',
              asyncResponse: true,
              saveReceipt: true,
              storageId: task.imageId
            },
            transferResponse: true,
            openConnection: this.$env.isSafari
          });

          if (image) {
            if (task.search.assetType === 'image') {
              try {
                image = await prepareImageForUpload({
                  image,
                  engine: this.engine,
                  target: 'api',
                  setBlob: !(this.$env.isSafari && this.$env.isMobile)
                });
              } catch (err) {
                if (err.name === 'EngineError') {
                  this.error = err.message;
                  return;
                }

                throw err;
              }
            }

            await this.search({
              session: task.session,
              search: task.search,
              image
            });
          } else {
            this.error = getText('error_invalidPageUrl');
          }
        } catch (err) {
          this.error = getText(
            'error_engine',
            getText(`engineName_${this.engine}`)
          );

          console.log(err.toString());
          throw err;
        }
      } else {
        this.error = getText('error_invalidPageUrl');
        this.dataLoaded = true;
      }
    },

    search: async function ({session, search, image} = {}) {
      if (this.engine === 'pinterest') {
        if (this.$env.isSafari && this.$env.isMobile) {
          // Safari 15: cross-origin request from extension page is blocked on mobile.
          const rsp = await browser.runtime.sendMessage({
            id: 'searchImage',
            session,
            search,
            image
          });

          if (rsp.error) {
            throw new Error(rsp.error);
          }

          this.results = rsp.data;
        } else {
          this.results = await searchPinterest({session, search, image});
        }

        this.layoutGrid();
      } else if (this.engine === 'google') {
        let tabUrl;
        if (this.$env.isSafari && this.$env.isMobile) {
          // Safari 15: cross-origin request from extension page is blocked on mobile.
          const rsp = await browser.runtime.sendMessage({
            id: 'searchImage',
            session,
            search,
            image
          });

          if (rsp.error) {
            throw new Error(rsp.error);
          }

          tabUrl = rsp.data;
        } else {
          tabUrl = await searchGoogle({session, search, image});
        }

        if (validateUrl(tabUrl)) {
          window.location.replace(tabUrl);
        }
      } else if (this.engine === 'googleLens') {
        let tabUrl;
        if (this.$env.isSafari && this.$env.isMobile) {
          // Safari 15: cross-origin request from extension page is blocked on mobile.
          const rsp = await browser.runtime.sendMessage({
            id: 'searchImage',
            session,
            search,
            image
          });

          if (rsp.error) {
            throw new Error(rsp.error);
          }

          tabUrl = rsp.data;
        } else {
          tabUrl = await searchGoogleLens({session, search, image});
        }

        if (validateUrl(tabUrl)) {
          window.location.replace(tabUrl);
        }
      }
    },

    layoutGrid: function () {
      this.$nextTick(() => {
        const grid = document.querySelector('.grid');
        imagesLoaded(grid).once('always', () => {
          const masonry = new Masonry(grid, {
            itemSelector: '.grid-item',
            horizontalOrder: true,
            transitionDuration: 0,
            initLayout: false
          });
          masonry.once('layoutComplete', () => {
            this.showSpinner = false;
            this.resultsLoaded = true;
          });
          masonry.layout();
        });
      });
    },

    openPage: async function (index) {
      await this.openTab(this.results[index].page);
    },

    openImage: async function (index) {
      await this.openTab(this.results[index].image);
    },

    openTab: async function (url) {
      await showPage({url});
    }
  },

  created: function () {
    this.setup();
  }
};
</script>

<style lang="scss">
@use 'vueton/styles' as vueton;

@include vueton.theme-base;
@include vueton.transitions;

html,
body,
.v-application,
.v-application__wrap {
  width: 100%;
}

body,
.v-application__wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.page-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 8px;
}

.spinner {
  width: 36px;
  height: 36px;
}

.error-content {
  display: flex;
  align-items: center;
  margin: auto;
  padding: 16px;

  & .error-icon {
    width: 48px;
    height: 48px;
    min-width: 48px;
    min-height: 48px;
    margin-right: 24px;
    @include vueton.theme-prop(background-color, error);
  }

  & .error-text {
    @include vueton.md2-typography(subtitle1);
    max-width: 520px;
  }
}

.grid {
  padding: 8px;

  width: 288px;
  @media (min-width: 424px) {
    width: 424px;
  }
  @media (min-width: 576px) {
    width: 448px;
  }
  @media (min-width: 768px) {
    width: 664px;
  }
  @media (min-width: 992px) {
    width: 880px;
  }
  @media (min-width: 1200px) {
    width: 1096px;
  }
}

.grid-item {
  width: 120px;
  @media (min-width: 576px) {
    width: 200px;
  }
  margin: 8px;
  padding: 16px;
  padding-bottom: 12px;
  transition: opacity 0.3s ease;
  opacity: 0;
}

.grid-item-loaded {
  opacity: 1;
}

.grid-item:focus {
  outline: 0;
}

.grid-item::before {
  content: ' ';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  @include vueton.theme-prop(background-color, surface-variant);
  border-radius: 16px;
  transition: all 0.2s ease;
  transform: scale(0.96);
  opacity: 0;
}

.grid-item:focus::before,
.grid-item:focus-within::before,
.grid-item:hover::before {
  transform: scale(1);
  opacity: 0.4;
}

.grid-item-image-wrap {
  min-height: 56px;
  max-height: 300px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

.grid-item-image {
  display: block;
  overflow: hidden;
  max-width: 100%;
  max-height: 100%;
  object-fit: scale-down;
}

.grid-item-footer {
  display: flex;
  align-items: center;
  column-gap: 8px;
  height: 24px;
  margin-top: 12px;
  justify-content: space-between;
}

.grid-item-footer-text {
  @include vueton.md2-typography(caption);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.grid-item-footer-button {
  width: 24px;
  height: 24px;
  margin-right: -12px;

  & .vn-icon {
    opacity: 0.8;
  }
}
</style>

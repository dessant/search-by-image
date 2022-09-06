<template>
  <div id="app" v-show="dataLoaded">
    <div v-if="results.length">
      <div v-show="resultsLoaded" class="title">
        {{
          getText('pageContent_search_title', getText(`engineName_${engine}`))
        }}
      </div>
      <div class="grid">
        <div
          class="grid-item"
          tabindex="0"
          :data-index="index"
          @keyup.enter="openPage"
          :class="resultClasses"
          v-for="(item, index) in results"
          :key="index"
        >
          <div
            class="grid-item-image-wrap"
            :data-index="index"
            @click="openPage"
          >
            <img class="grid-item-image" :src="item.image" />
          </div>
          <div class="grid-item-footer">
            <div class="grid-item-footer-text">{{ item.text }}</div>
            <img
              class="grid-item-footer-button"
              src="/src/assets/icons/misc/image.svg"
              :data-index="index"
              @click="openImage"
            />
          </div>
        </div>
      </div>
    </div>
    <div v-if="!resultsLoaded" class="page-overlay">
      <div class="error-content" v-if="error">
        <img class="error-icon" src="/src/assets/icons/misc/error.svg" />
        <div class="error-text">{{ error }}</div>
      </div>

      <div v-if="showSpinner && !error" class="sk-rotating-plane"></div>
    </div>
  </div>
</template>

<script>
import Masonry from 'masonry-layout';
import imagesLoaded from 'imagesloaded';

import {validateUrl, sendLargeMessage} from 'utils/app';
import {getText, createTab, getActiveTab} from 'utils/common';
import {
  prepareImageForUpload,
  searchGoogle,
  searchGoogleLens,
  searchPinterest
} from 'utils/engines';

export default {
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
            document.body.classList.add('overflow-visible');
          });
          masonry.layout();
        });
      });
    },

    openPage: async function (ev) {
      await this.openTab(this.results[ev.currentTarget.dataset.index].page);
    },

    openImage: async function (ev) {
      await this.openTab(this.results[ev.target.dataset.index].image);
    },

    openTab: async function (url) {
      const activeTab = await getActiveTab();
      await createTab({
        url,
        index: activeTab.index + 1,
        openerTabId: activeTab.id
      });
    }
  },

  created: async function () {
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
  }
};
</script>

<style lang="scss">
$spinkit-size: 36px;
$spinkit-spinner-color: #e74c3c;

@import 'spinkit/scss/spinners/1-rotating-plane';
@import '@material/theme/mixins';
@import '@material/typography/mixins';

.overflow-visible {
  overflow: visible;
}

html,
body {
  width: 100%;
  height: 100%;
}

body {
  margin: 0;
  @include mdc-typography-base;
  font-size: 100%;
  background-color: #ffffff;
  display: flex;
  justify-content: center;
  overflow: hidden;
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

.error-content {
  display: flex;
  align-items: center;
  margin: auto;
  padding: 16px;

  & .error-icon {
    width: 48px;
    height: 48px;
    margin-right: 24px;
  }

  & .error-text {
    @include mdc-typography(subtitle1);
    @include mdc-theme-prop(color, #252525);
    max-width: 520px;
  }
}

#app {
  width: 100%;
  @media (min-width: 576px) {
    width: 464px;
  }
  @media (min-width: 768px) {
    width: 696px;
  }
  @media (min-width: 992px) {
    width: 928px;
  }
  @media (min-width: 1200px) {
    width: 1160px;
  }
}

.title {
  @include mdc-typography(headline6);
  @media (min-width: 576px) {
    @include mdc-typography(headline5);
  }
  margin-left: 16px;
  margin-right: 16px;
  margin-top: 24px;
  margin-bottom: 24px;
}

.grid-item {
  width: 120px;
  @media (min-width: 576px) {
    width: 200px;
  }
  margin: 8px;
  padding: 8px;
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
  background-color: #bdc3c7;
  border-radius: 4px;
  transition: all 0.2s ease;
  transform: scale(0.96);
  opacity: 0;
}

.grid-item:focus::before,
.grid-item:hover::before {
  transform: scale(1);
  opacity: 0.26;
}

.grid-item-image-wrap {
  min-height: 120px;
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
  height: 24px;
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.grid-item-footer-text {
  padding-left: 4px;
  @include mdc-typography(caption);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.grid-item-footer-button {
  width: 24px;
  height: 24px;
  margin-left: 12px;
  cursor: pointer;
  opacity: 0.7;
}

.title,
.error-text,
.grid-item-footer-text {
  @include mdc-theme-prop(color, #252525);
}
</style>

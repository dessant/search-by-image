<template>
  <div id="app" v-show="dataLoaded">
    <div v-if="results.length">
      <div v-show="resultsLoaded" class="title">
        {{
          getText('pageContent_results_title', getText(`engineName_${engine}`))
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
            <img
              class="grid-item-image"
              referrerpolicy="no-referrer"
              :src="item.image"
            />
          </div>
          <div class="grid-item-footer">
            <div class="grid-item-footer-text">{{ item.text }}</div>
            <img
              class="grid-item-footer-button"
              src="/src/icons/misc/image.svg"
              :data-index="index"
              @click="openImage"
            />
          </div>
        </div>
      </div>
    </div>
    <div v-if="!resultsLoaded" class="page-overlay">
      <div v-if="showSpinner && !error" class="sk-rotating-plane"></div>
      <div v-if="error">
        <div class="error-icon">:/</div>
        <div class="error-text">{{ error }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import browser from 'webextension-polyfill';
import Masonry from 'masonry-layout';
import imagesLoaded from 'imagesloaded';

import {getMaxImageSize, getLargeImageMessage} from 'utils/app';
import {getText, createTab, getActiveTab, dataUrlToBlob} from 'utils/common';

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

    upload: async function ({task, search, image}) {
      if (this.engine === 'pinterest') {
        let rsp;
        if (search.method === 'upload') {
          const data = new FormData();
          data.append('image', image.imageBlob, image.imageFilename);
          data.append('x', '0');
          data.append('y', '0');
          data.append('w', '1');
          data.append('h', '1');
          data.append('base_scheme', 'https');
          rsp = await fetch(
            'https://api.pinterest.com/v3/visual_search/extension/image/',
            {
              referrer: '',
              mode: 'cors',
              method: 'PUT',
              body: data
            }
          );
        } else {
          rsp = await fetch(
            'https://api.pinterest.com/v3/visual_search/flashlight/url/' +
              `?url=${encodeURIComponent(image.imageUrl)}` +
              '&x=0&y=0&w=1&h=1&base_scheme=https',
            {
              referrer: '',
              mode: 'cors'
            }
          );
        }

        const response = await rsp.json();

        if (
          rsp.status !== 200 ||
          response.status !== 'success' ||
          !response.data ||
          !response.data.length
        ) {
          throw new Error('search failed');
        }

        this.results = response.data.map(item => ({
          page: `https://pinterest.com/pin/${item.id}/`,
          image: item.image_large_url,
          text: item.description
        }));
      }

      this.layoutGrid();
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
      await createTab(url, {
        index: activeTab.index + 1,
        openerTabId: activeTab.id
      });
    }
  },

  created: async function () {
    const storageKey = new URL(window.location.href).searchParams.get(
      'session'
    );

    const session = await browser.runtime.sendMessage({
      id: 'storageRequest',
      asyncResponse: true,
      storageKey
    });

    if (session) {
      try {
        this.engine = session.search.engine;

        document.title = getText('pageTitle', [
          getText(`optionTitle_${this.engine}`),
          getText('extensionName')
        ]);

        if (session.search.method === 'upload') {
          const maxSize = getMaxImageSize(this.engine);
          if (session.search.imageSize > maxSize) {
            this.error = getLargeImageMessage(this.engine, maxSize);
            this.dataLoaded = true;
            return;
          }
        }

        this.showSpinner = true;
        this.dataLoaded = true;

        const image = await browser.runtime.sendMessage({
          id: 'storageRequest',
          asyncResponse: true,
          storageKey: session.imageKey
        });

        if (image) {
          if (session.search.method === 'upload') {
            image.imageBlob = dataUrlToBlob(image.imageDataUrl);
          }
          await this.upload({
            task: session.task,
            search: session.search,
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
        this.dataLoaded = true;

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
$mdc-theme-primary: #1abc9c;

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

.error-icon {
  font-size: 72px;
  color: #e74c3c;
}

.error-text {
  @include mdc-typography(subtitle1);
  @include mdc-theme-prop(color, text-primary-on-light);
  max-width: 520px;
  margin-top: 24px;
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
  @include mdc-theme-prop(color, text-primary-on-light);
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
  @include mdc-theme-prop(color, text-primary-on-light);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.grid-item-footer-button {
  width: 24px;
  height: 24px;
  margin-left: 24px;
  cursor: pointer;
  opacity: 0.7;
}

.firefox-android {
  & .title,
  & .grid-item-footer-text {
    @include mdc-theme-prop(color, #312a65);
  }
}
</style>

<template>
<div id="app">
  <div class="notice" v-if="showNotice">
    This page is shown during your 10th and 100th search,
    the search results can be found next to the current tab.
  </div>

  <div class="title">
    Thank you for using Search by Image!
  </div>

  <div class="desc">
    <div class="desc-text">
      <p>
        <span class="ext-name">Search by Image</span> is a project fueled by
        love and avocado toast, created for everyone to freely use and improve.
      </p>
      <p>
        You can support our goals and make a difference by sharing some avocados
        with us! Every ounce will help add new features and keep things afloat.
      </p>
    </div>
    <img class="desc-image" src="/src/icons/misc/avocado-toast.jpg">
  </div>

  <transition name="goals">
    <div class="goals-wrap" v-if="goals">
      <div class="cta">
        Support our current goals
      </div>
      <div class="goals">
        <div class="goal" v-for="goal in goals.items" :key="goal.id">
          <div class="goal-bullet">•</div>
          {{ goal }}
        </div>
      </div>
      <v-linear-progress :progress="goals.progress.value / goals.progress.goal"
          :buffer="0.8">
      </v-linear-progress>
      <div class="progress-details">
        <div>
          Raised
          <span class="progress-value">{{ goals.progress.value }}</span>
          <img class="progress-token" src="/src/icons/misc/avocado.svg">
          of
          <span class="progress-value">{{ goals.progress.goal }}</span>
          <img class="progress-token" src="/src/icons/misc/avocado.svg">
          goal
        </div>
        <div>
          <span class="progress-value">1</span>
          <img class="progress-token" src="/src/icons/misc/avocado.svg">
          =
          {{ goals.progress.currency.symbol }}<span
              class="progress-value">{{ goals.progress.currency.exchangeRate }}
          </span>
        </div>
      </div>
    </div>
  </transition>

  <div class="cta-buttons">
    <v-button class="contribute-button"
        :raised="true"
        @click="contribute('patreon')">
      <img class="patreon-image" src="/src/icons/misc/patreon.png">
    </v-button>
    <v-button class="contribute-button"
        :raised="true"
        @click="contribute('paypal')">
      <img class="paypal-image" src="/src/icons/misc/paypal.png">
    </v-button>
  </div>

  <div class="cta-coin" @click="contribute('bitcoin')">
    <img src="/src/icons/misc/bitcoin.svg">
    <div>1CtN7pqNAtccD6GsV2nducepRQTFub5G8J</div>
  </div>
</div>
</template>

<script>
import browser from 'webextension-polyfill';
import {Button, LinearProgress} from 'ext-components';

import storage from 'storage/storage';
import {getText, getActiveTab, createTab} from 'utils/common';

export default {
  components: {
    [Button.name]: Button,
    [LinearProgress.name]: LinearProgress
  },

  data: function() {
    return {
      showNotice: false,
      goals: null,
      apiHost: 'https://extensions.rmn.space'
    };
  },

  methods: {
    getText,

    contribute: async function(method) {
      const activeTab = await getActiveTab();
      await createTab(
        `${this.apiHost}/api/v1/contribute/search-by-image/${method}`,
        activeTab.index + 1
      );
    }
  },

  created: function() {
    document.title = getText('pageTitle', [
      getText('pageTitle_contribute'),
      getText('extensionName')
    ]);

    const query = new URL(window.location.href).searchParams;
    if (query.get('action') === 'search') {
      this.showNotice = true;
    }
  },

  mounted: async function() {
    const rsp = await fetch(`${this.apiHost}/api/v1/goals/search-by-image`);
    const goals = await rsp.json();

    const exchangeRate = goals.progress.currency.exchangeRate;
    goals.progress.value = Math.trunc(goals.progress.value / exchangeRate);
    goals.progress.goal = Math.trunc(goals.progress.goal / exchangeRate);

    this.goals = goals;
  }
};
</script>

<style lang="scss">
$mdc-theme-primary: #1abc9c;

@import '@material/button/mixins';
@import '@material/theme/mixins';
@import '@material/typography/mixins';

body {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
}

#app {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 856px;
}

.notice {
  @include mdc-typography(body1);
  @include mdc-theme-prop(color, text-primary-on-light);
  margin-top: 12px;
  max-width: 90vw;
  padding: 12px 24px;
  background-color: #ecf0f1;
  border-radius: 3px;
}

.title {
  @include mdc-typography(title);
  @include mdc-theme-prop(color, text-primary-on-light);
  margin-top: 24px;
  max-width: 90vw;
}

.desc {
  display: grid;
  align-items: center;
  justify-items: center;
  grid-row-gap: 24px;
  margin-top: 24px;
}

.desc-text {
  @include mdc-typography(subheading1);
  @include mdc-theme-prop(color, text-primary-on-light);
  max-width: 90vw;
}

.desc-text .ext-name {
  font-weight: 500;
}

.desc-image {
  max-width: 60vw;
}

.goals-wrap {
  margin-top: 36px;
  width: 90vw;
}

.cta {
  @include mdc-typography(title);
  @include mdc-theme-prop(color, text-primary-on-light);
  text-align: center;
}

.goals {
  @include mdc-typography(subheading1);
  @include mdc-theme-prop(color, text-primary-on-light);
}

.goals {
  margin-top: 24px;
  margin-bottom: 12px;
}

.goal {
  display: flex;
  align-items: center;
}

.goal-bullet {
  font-size: 36px;
  color: $mdc-theme-primary;
  margin-right: 8px;
}

.progress-details {
  display: flex;
  justify-content: space-between;
  @include mdc-typography(caption);
  @include mdc-theme-prop(color, text-secondary-on-light);
  font-weight: 500;
  margin-top: 12px;
}

.progress-value {
  font-weight: 700;
}

.progress-token {
  width: auto;
  height: 14px;
  vertical-align: -10%;
  opacity: 0.7;
}

.goals-enter-active, .goals-leave-active {
  max-height: 300px;
  margin-top: 24px;
  transition: max-height .4s ease,
              margin-top .4s ease,
              opacity .3s ease;
}

.goals-enter, .goals-leave-to {
  max-height: 0;
  margin-top: 0;
  opacity: 0;
}

.cta-buttons {
  display: grid;
  grid-row-gap: 24px;
  margin-top: 48px;
}

.cta-coin {
  display: grid;
  align-items: center;
  justify-items: center;
  grid-template-columns: repeat(2, auto);
  grid-column-gap: 8px;
  margin-top: 24px;
  margin-bottom: 24px;
  @include mdc-typography(caption);
  font-weight: 700;
  color: #3498db;
  cursor: pointer;
}

.cta-coin:hover,
.cta-coin:active {
  color: #2980b9;
}

.contribute-button {
  display: flex;
  align-items: center;
  justify-content: center;
  @include mdc-button-container-fill-color(#FFAD01);
  width: 192px !important;
  height: 48px !important;
}

.contribute-button img {
  width: auto;
  height: 20px;
}

@media (min-width: 360px) {
  .cta-coin {
    @include mdc-typography(body1);
    font-weight: 700;
  }
}

@media (min-width: 480px) {
  .cta-buttons {
    grid-template-columns: repeat(2, 1fr);
    grid-column-gap: 56px;
    margin-top: 56px;
  }

  .cta-coin {
    @include mdc-typography(subheading2);
    font-weight: 700;
    margin-top: 36px;
  }

  .desc-image {
    max-width: 260px;
  }
}

@media (min-width: 576px) {
  .title {
    @include mdc-typography(headline);
  }

  .desc-text {
    max-width: 70vw;
  }

  .goals-wrap {
    width: 70vw;
  }
}

@media (min-width: 768px) {
  .title {
    @include mdc-typography(display1);
    @include mdc-theme-prop(color, text-primary-on-light);
    margin-top: 48px;
  }

  .desc {
    grid-template-columns: repeat(2, auto);
    grid-column-gap: 56px;
    margin-top: 72px;
  }

  .desc-text {
    @include mdc-typography(subheading2);
    max-width: 400px;
  }

  .desc-image {
    max-width: 300px;
  }

  .goals-wrap {
    margin-top: 48px;
    width: 100%;
  }

  .cta {
    @include mdc-typography(headline);
  }

  .goals {
    @include mdc-typography(subheading2);
  }

  .goals {
    margin-top: 48px;
  }

  .goal-bullet {
    font-size: 48px;
  }

  .progress-details {
    @include mdc-typography(body1);
  }

  .progress-token {
    height: 16px;
  }

  .goals-enter-active, .goals-leave-active {
    margin-top: 48px;
  }
}
</style>

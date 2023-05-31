import {createVuetify} from 'vuetify';

import {getAppTheme} from 'utils/app';
import {getDarkColorSchemeQuery} from 'utils/common';

const LightTheme = {
  dark: false,
  colors: {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    primary: '#6750A4',
    secondary: '#625B71'
  }
};

const DarkTheme = {
  dark: true,
  colors: {
    background: '#1C1B1F',
    surface: '#1C1B1F',
    primary: '#D0BCFF',
    secondary: '#CCC2DC'
  }
};

async function configTheme(vuetify) {
  async function setTheme(theme, {dispatchChange = true} = {}) {
    theme = await getAppTheme();

    document.documentElement.style.setProperty('color-scheme', theme);
    vuetify.theme.global.name.value = theme;

    if (dispatchChange) {
      document.dispatchEvent(new CustomEvent('themeChange', {detail: theme}));
    }
  }

  getDarkColorSchemeQuery().addEventListener('change', function () {
    setTheme();
  });

  browser.storage.onChanged.addListener(function (changes, area) {
    if (area === 'local' && changes.appTheme) {
      setTheme(changes.appTheme.newValue);
    }
  });

  await setTheme({dispatchChange: false});
}

async function configVuetify(app) {
  const vuetify = createVuetify({
    theme: {
      themes: {light: LightTheme, dark: DarkTheme}
    },
    defaults: {
      VDialog: {
        eager: true
      },
      VSelect: {
        eager: true
      },
      VSnackbar: {
        eager: true
      },
      VMenu: {
        eager: true
      }
    }
  });

  await configTheme(vuetify);

  app.use(vuetify);
}

export {configTheme, configVuetify};

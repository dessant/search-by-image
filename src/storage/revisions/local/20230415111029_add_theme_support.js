import {getDayPrecisionEpoch} from 'utils/common';

const message = 'Add theme support';

const revision = '20230415111029_add_theme_support';

async function upgrade() {
  const changes = {
    appTheme: 'auto', // auto, light, dark
    showContribPage: true,
    showEngineIcons: true,
    contribPageLastAutoOpen: 0,
    pinActionToolbarViewImage: true,
    pinActionToolbarShareImage: false,
    pinActionToolbarOptions: false,
    pinActionToolbarContribute: true
  };

  const {installTime, searchCount} = await browser.storage.local.get([
    'installTime',
    'searchCount'
  ]);
  changes.installTime = getDayPrecisionEpoch(installTime);
  changes.useCount = searchCount;

  await browser.storage.local.remove([
    'searchCount',
    'viewImageAction',
    'shareImageAction'
  ]);

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};

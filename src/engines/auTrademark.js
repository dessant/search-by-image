import {findNode, isAndroid} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'auTrademark';

async function search({task, search, image, storageKeys}) {
  if (await isAndroid()) {
    if (document.cookie.match(/_fullMobile/)) {
      if (document.location.pathname.endsWith('/quick')) {
        (await findNode('a#goToAdvancedSearch')).click();
        return;
      }
    } else {
      (await findNode('#pageContent a[onclick^="document.cookie"]')).click();
      return;
    }
  }

  const inputSelector = 'input.dz-hidden-input';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  input.dispatchEvent(new Event('change'));

  await findNode('div.cropper-container');

  await sendReceipt(storageKeys);

  (
    await findNode('#qa-search-submit:not(.disabled)', {
      observerOptions: {attributes: true, attributeFilter: ['class']}
    })
  ).click();
}

function init() {
  initSearch(search, engine, sessionKey);
}

init();

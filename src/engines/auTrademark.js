import {findNode, processNode, isAndroid} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'auTrademark';

async function search({task, search, image, storageKeys}) {
  if (await isAndroid()) {
    // go to desktop version
    processNode(
      '#pageContent a[onclick^="document.cookie"]',
      node => node.click(),
      {throwError: false}
    );

    // go to advanced search
    processNode('a#goToAdvancedSearch', node => node.click(), {
      throwError: false
    });
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

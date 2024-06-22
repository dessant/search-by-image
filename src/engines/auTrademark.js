import {findNode, processNode, runOnce} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'auTrademark';

async function search({session, search, image, storageIds}) {
  // go to desktop version on mobile
  processNode(
    '#pageContent a[onclick^="document.cookie=\'_fullMobile=true"]',
    node => node.click(),
    {throwError: false}
  );

  // go to advanced search on mobile
  if (window.location.pathname.startsWith('/trademarks/search/quick')) {
    await processNode('a#goToAdvancedSearch', node => node.click());
  }

  await findNode('.advanced-search div#sideImageUpload');

  const inputSelector = 'input.dz-hidden-input';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  input.dispatchEvent(new Event('change'));

  await findNode('div.cropper-container');

  await sendReceipt(storageIds);

  (
    await findNode('#qa-search-submit:not(.disabled)', {
      observerOptions: {attributes: true, attributeFilter: ['class']}
    })
  ).click();
}

function init() {
  initSearch(search, engine, taskId);
}

if (runOnce('search')) {
  init();
}

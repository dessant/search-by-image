import {findNode, executeScriptMainContext, runOnce} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'taobao';

async function search({session, search, image, storageIds}) {
  await executeScriptMainContext({func: 'taobaoPatchContext'});

  (await findNode('div.image-search-icon-wrapper', {timeout: 120000})).click();

  const inputSelector = 'input[type="file"]';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  window.setTimeout(() => {
    input.dispatchEvent(new Event('change', {bubbles: true}));
  }, 100);

  (
    await findNode('div#image-search-upload-button.upload-button-active', {
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

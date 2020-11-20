import {findNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'tmview';

async function search({task, search, image, storageKeys}) {
  const inputSelector = 'input#economicDocuments';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  input.dispatchEvent(new Event('change', {bubbles: true}));

  await findNode('img[alt=tmview]');

  await sendReceipt(storageKeys);

  (await findNode('button[data-test-id=search-button]')).click();
}

function init() {
  initSearch(search, engine, sessionKey);
}

init();

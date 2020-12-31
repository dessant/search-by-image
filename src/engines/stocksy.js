import {findNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'stocksy';

async function search({task, search, image, storageKeys}) {
  (await findNode('button[id$="btn-visual-search"]')).click();

  const inputSelector = 'input#vs-file';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageKeys);

  input.dispatchEvent(new Event('change', {bubbles: true}));
}

function init() {
  initSearch(search, engine, sessionKey);
}

init();

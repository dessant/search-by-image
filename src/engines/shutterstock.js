import {findNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'shutterstock';

async function search({task, search, image, storageKeys}) {
  (
    await findNode('button[data-track-label="reverseImageSearchButton"]')
  ).click();

  const inputSelector = 'input[type="file"]';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageKeys);

  input.dispatchEvent(new Event('change', {bubbles: true}));
}

function init() {
  initSearch(search, engine, sessionKey);
}

init();

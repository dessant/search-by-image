import {findNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'pixta';

async function search({task, search, image, storageKeys}) {
  (await findNode('div.search-image-button.search-image-button--top')).click();

  const inputSelector = 'input#image[type="file"]';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageKeys);

  input.dispatchEvent(new Event('change'));
}

function init() {
  initSearch(search, engine, sessionKey);
}

init();

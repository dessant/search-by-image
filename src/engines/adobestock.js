import {findNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'adobestock';

async function search({task, search, image, storageKeys}) {
  (await findNode('i.js-camera-icon')).click();

  const inputSelector = '#js-vsupload';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageKeys);

  input.dispatchEvent(new Event('change'));
}

function init() {
  initSearch(search, engine, sessionKey);
}

init();

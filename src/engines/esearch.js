import {findNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'esearch';

async function search({task, search, image, storageKeys}) {
  const inputSelector = 'input.fileUploader-basic';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  input.dispatchEvent(new Event('change'));

  await findNode('div.imageViewer');

  await sendReceipt(storageKeys);

  (await findNode('#basicSearchBigButton')).click();
}

function init() {
  initSearch(search, engine, sessionKey);
}

init();

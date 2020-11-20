import {findNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'mailru';

async function search({task, search, image, storageKeys}) {
  (await findNode('button.MainSearchFieldContainer-buttonCamera')).click();

  const inputSelector = '#ImageUploadBlock-inputFile';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageKeys);

  input.dispatchEvent(new Event('change', {bubbles: true}));
}

function init() {
  initSearch(search, engine, sessionKey);
}

init();

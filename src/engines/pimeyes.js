import {findNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'pimeyes';

async function search({task, search, image, storageKeys}) {
  document.cookie = `uploadPermissions=${Date.now()}; path=/`;

  (await findNode('.upload-bar button[aria-label="upload photo" i]')).click();

  const inputSelector = 'input#file-input';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageKeys);

  input.dispatchEvent(new Event('change'));
}

function init() {
  initSearch(search, engine, sessionKey);
}

init();

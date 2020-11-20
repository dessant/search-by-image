import {findNode, isAndroid} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'wayfair';

async function search({task, search, image, storageKeys}) {
  (await findNode('header#store_nav button.SearchWithPhotoButton')).click();

  const inputSelector = (await isAndroid())
    ? 'input#MODAL_CAMERA'
    : 'input#FileUpload-input0';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageKeys);

  input.dispatchEvent(new Event('change', {bubbles: true}));
}

function init() {
  initSearch(search, engine, sessionKey);
}

init();

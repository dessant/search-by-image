import {findNode, isAndroid} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'wayfair';

async function upload({task, search, image}) {
  (await findNode('header#store_nav button.SearchWithPhotoButton')).click();

  const inputSelector = (await isAndroid())
    ? 'input#MODAL_CAMERA'
    : 'input#FileUpload-input0';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  input.dispatchEvent(new Event('change', {bubbles: true}));
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

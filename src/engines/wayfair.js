import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'wayfair';

async function upload({task, search, image}) {
  (
    await findNode('nav.Header-primaryNav button.SearchWithPhotoButton')
  ).click();

  const input = await Promise.race([
    findNode('input#FileUpload-input0'), // desktop
    findNode('input#MODAL_CAMERA') // mobile
  ]);

  setFileInputData(input, image);

  input.dispatchEvent(new Event('change', {bubbles: true}));
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'pimeyes';

async function upload({task, search, image}) {
  document.cookie = `uploadPermissions=${Date.now()}; path=/`;

  (await findNode('.upload-bar button[aria-label="upload photo" i]')).click();

  const input = await findNode('input#file-input');

  setFileInputData(input, image);

  input.dispatchEvent(new Event('change'));
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

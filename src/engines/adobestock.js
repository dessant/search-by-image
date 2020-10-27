import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'adobestock';

async function upload({task, search, image}) {
  (await findNode('i.js-camera-icon')).click();

  const input = await findNode('#js-vsupload');
  setFileInputData(input, image);

  input.dispatchEvent(new Event('change'));
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

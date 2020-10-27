import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'getty';

async function upload({task, search, image}) {
  (await findNode('a.search-camera-icon')).click();

  const input = await findNode('input[type=file]');
  setFileInputData(input, image);

  input.dispatchEvent(new Event('change'));
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

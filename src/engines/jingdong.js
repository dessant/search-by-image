import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'jingdong';

async function upload({task, search, image}) {
  const input = await findNode('input.upload-trigger', {timeout: 10000});
  setFileInputData(input, image);

  input.dispatchEvent(new Event('change'));
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

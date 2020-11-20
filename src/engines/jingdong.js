import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'jingdong';

async function upload({task, search, image}) {
  const inputSelector = 'input[type=file]';
  const input = await findNode(inputSelector, {timeout: 10000});

  await setFileInputData(inputSelector, input, image);

  input.dispatchEvent(new Event('change'));
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

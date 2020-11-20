import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'shutterstock';

async function upload({task, search, image}) {
  (
    await findNode('button[data-track-label="reverseImageSearchButton"]')
  ).click();

  const inputSelector = 'input[type="file"]';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  input.dispatchEvent(new Event('change', {bubbles: true}));
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'mailru';

async function upload({task, search, image}) {
  (await findNode('button.MainSearchFieldContainer-buttonCamera')).click();

  const inputSelector = '#ImageUploadBlock-inputFile';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  input.dispatchEvent(new Event('change', {bubbles: true}));
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

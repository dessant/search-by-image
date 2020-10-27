import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'mailru';

async function upload({task, search, image}) {
  (await findNode('button.MainSearchFieldContainer-buttonCamera')).click();

  const input = await findNode('#ImageUploadBlock-inputFile');
  setFileInputData(input, image);

  input.dispatchEvent(new Event('change', {bubbles: true}));
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

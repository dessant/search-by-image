import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'esearch';

async function upload({task, search, image}) {
  const inputSelector = 'input.fileUploader-basic';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  input.dispatchEvent(new Event('change'));

  await findNode('div.imageViewer');

  (await findNode('#basicSearchBigButton')).click();
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

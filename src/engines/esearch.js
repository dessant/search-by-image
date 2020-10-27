import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'esearch';

async function upload({task, search, image}) {
  const input = await findNode('input.fileUploader-basic');
  setFileInputData(input, image);

  input.dispatchEvent(new Event('change'));

  await findNode('div.imageViewer');

  (await findNode('#basicSearchBigButton')).click();
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

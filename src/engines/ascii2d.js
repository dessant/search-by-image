import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'ascii2d';

async function upload({task, search, image}) {
  const input = await findNode('#file-form');
  setFileInputData(input, image);

  (await findNode('#file_upload')).submit();
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

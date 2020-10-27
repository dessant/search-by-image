import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'iqdb';

async function upload({task, search, image}) {
  const input = await findNode('#file');
  setFileInputData(input, image);

  (await findNode('form')).submit();
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

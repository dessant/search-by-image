import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'iqdb';

async function upload({task, search, image}) {
  const inputSelector = '#file';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  (await findNode('form')).submit();
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

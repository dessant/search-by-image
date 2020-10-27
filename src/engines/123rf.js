import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = '123rf';

async function upload({task, search, image}) {
  (await findNode('#cam_sim')).click();

  const input = await findNode('#file_upload');
  setFileInputData(input, image);

  (await findNode('#btn_submit2')).click();
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

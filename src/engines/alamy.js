import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'alamy';

async function upload({task, search, image}) {
  (await findNode('div.visual-image-search-holder')).click();

  const input = await findNode('#fileupload');
  setFileInputData(input, image);

  input.dispatchEvent(new Event('change'));
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

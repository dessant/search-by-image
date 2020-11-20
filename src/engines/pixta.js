import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'pixta';

async function upload({task, search, image}) {
  (await findNode('div.search-form__search-by-image')).click();

  const inputSelector = 'input#image[type="file"]';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  input.dispatchEvent(new Event('change'));
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

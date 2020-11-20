import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'auDesign';

async function upload({task, search, image}) {
  const inputSelector = 'input[type=file]';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  input.dispatchEvent(new Event('change'));

  (await findNode('.popup-content .buttons button')).click();

  (
    await Promise.race([
      findNode('.as-search-button'), // desktop
      findNode('.qs-search-button') // mobile
    ])
  ).click();
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

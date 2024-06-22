import {findNode, runOnce} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'auDesign';

async function search({session, search, image, storageIds}) {
  const inputSelector = 'input[type=file]';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  input.dispatchEvent(new Event('change'));

  (await findNode('.popup-content .buttons button')).click();

  await sendReceipt(storageIds);

  (
    await Promise.race([
      findNode('.as-search-button'), // desktop
      findNode('.qs-search-button') // mobile
    ])
  ).click();
}

function init() {
  initSearch(search, engine, taskId);
}

if (runOnce('search')) {
  init();
}

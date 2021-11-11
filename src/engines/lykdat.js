import {findNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'lykdat';

async function search({session, search, image, storageIds}) {
  const inputSelector = '.top-search-image-box input[type=file]';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  input.dispatchEvent(new Event('change', {bubbles: true}));

  (await findNode('.finisher button')).click();
}

function init() {
  initSearch(search, engine, taskId);
}

init();

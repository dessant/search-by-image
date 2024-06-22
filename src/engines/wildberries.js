import {findNode, runOnce, sleep} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'wildberries';

async function search({session, search, image, storageIds}) {
  // wait for search service to load
  await sleep(1000);

  const inputSelector = 'input[type=file][data-link*="searchByImage"]';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  input.dispatchEvent(new Event('change'));
}

function init() {
  initSearch(search, engine, taskId);
}

if (runOnce('search')) {
  init();
}

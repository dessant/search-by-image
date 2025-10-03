import {findNode, runOnce, sleep} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'freepik';

async function search({session, search, image, storageIds} = {}) {
  (
    await findNode(
      'form button[data-cy="search-by-image"][data-state="closed"]'
    )
  ).click();

  const inputSelector = 'input[type=file]';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  input.dispatchEvent(new Event('change', {bubbles: true}));

  await sleep(1000);

  (await findNode('div[role=dialog] button[type=submit]')).click();
}

async function engineAccess() {
  if (document.title.toLowerCase() === 'access denied') {
    return false;
  }

  return true;
}

function init() {
  initSearch(search, engine, taskId, {engineAccess, canvasAccess: true});
}

if (runOnce('search')) {
  init();
}

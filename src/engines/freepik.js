import {findNode, runOnce, sleep} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'freepik';

async function search({session, search, image, storageIds}) {
  (
    await findNode('form > div > button[data-state="closed"]:last-of-type')
  ).click();

  const inputSelector = 'input[type=file]';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  input.dispatchEvent(new Event('change', {bubbles: true}));

  await sleep(1000);

  (await findNode('.bg-surface-1 button[type=submit]')).click();
}

function init() {
  initSearch(search, engine, taskId);
}

if (runOnce('search')) {
  init();
}

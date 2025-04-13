import {findNode, runOnce} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'freepik';

async function search({session, search, image, storageIds}) {
  (await findNode('form > div > button[data-state="closed"]')).click();

  const inputSelector = 'input[type=file]';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  input.dispatchEvent(new Event('change', {bubbles: true}));

  (
    await findNode(
      'button[data-cy="home-hero-bar-upload-modal-submit"]:not([disabled])',
      {observerOptions: {attributes: true}}
    )
  ).click();
}

function init() {
  initSearch(search, engine, taskId);
}

if (runOnce('search')) {
  init();
}

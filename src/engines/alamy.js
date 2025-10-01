import {findNode, runOnce} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'alamy';

async function search({session, search, image, storageIds}) {
  (await findNode('button[data-testid="searchByImageLong"]')).click();

  const inputSelector = '#upload-an-image-tab input[type=file]';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  input.dispatchEvent(new Event('change', {bubbles: true}));
}

function init() {
  if (
    !document
      .querySelector('body')
      ?.textContent.toLowerCase()
      .includes('has been blocked')
  ) {
    initSearch(search, engine, taskId);
  }
}

if (runOnce('search')) {
  init();
}

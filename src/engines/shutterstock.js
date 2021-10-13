import {findNode, isMobile} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'shutterstock';

async function search({session, search, image, storageIds}) {
  if (await isMobile()) {
    // some elements are loaded only after the first user interaction
    window.dispatchEvent(new Event('touchstart'));
  }

  (
    await findNode('button[data-track-label="reverseImageSearchButton"]')
  ).click();

  const inputSelector = 'input[type="file"]';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  input.dispatchEvent(new Event('change', {bubbles: true}));
}

function init() {
  initSearch(search, engine, taskId);
}

init();

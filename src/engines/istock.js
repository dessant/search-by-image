import {findNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'istock';

async function search({session, search, image, storageIds}) {
  (
    await Promise.race([
      findNode('button[class*="SearchByImageButton"]'),
      findNode('.search-bar__camera a.search-camera-icon') // new layout
    ])
  ).click();

  const inputSelector = 'input[type=file]';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  input.dispatchEvent(new Event('change', {bubbles: true}));
}

function init() {
  initSearch(search, engine, taskId);
}

init();

import {findNode, runOnce} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'clipretrieval';

async function search({session, search, image, storageIds}) {
  const inputSelector = 'input[type=file]';
  const input = await findNode(inputSelector, {
    rootNode: (await findNode('clip-front')).shadowRoot
  });

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

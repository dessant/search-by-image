import {
  findNode,
  processNode,
  makeDocumentVisible,
  runOnce
} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'ikea';

async function search({session, search, image, storageIds}) {
  // go to regional site
  processNode('.region-picker a.website-link', node => node.click(), {
    throwError: false
  });

  (await findNode('#search-box-visual-search-icon')).click();

  const inputSelector = 'input[type=file]';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  input.dispatchEvent(new Event('change'));
}

function init() {
  makeDocumentVisible();
  initSearch(search, engine, taskId);
}

if (runOnce('search')) {
  init();
}

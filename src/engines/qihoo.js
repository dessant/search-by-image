import {findNode, runOnce} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'qihoo';

async function search({session, search, image, storageIds} = {}) {
  let inputSelector;
  let input;
  if (document.head.querySelector('meta[name^="apple-mobile"]')) {
    // mobile
    inputSelector = '.g-header-st-form input[type="file"]';
    input = await findNode(inputSelector, {timeout: 120000});
  } else {
    // desktop
    inputSelector = 'input#stUpload';
    input = await findNode(inputSelector);
  }

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

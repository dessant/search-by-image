import {
  findNode,
  processNode,
  makeDocumentVisible,
  runOnce
} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'shein';

async function search({session, search, image, storageIds}) {
  // close upload progress popup
  processNode('.c-modal-wrap[tip="uploading"] button', node => node.click(), {
    throwError: false
  });
  // close promotion popup
  processNode('.in-pop-inner button.btn-shop-now', node => node.click(), {
    throwError: false
  });

  (await findNode('i.search-upload__icon')).click();

  const inputSelector = '.search-upload input[type="file"]';
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

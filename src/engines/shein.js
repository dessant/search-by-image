import {findNode, runOnce} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'shein';

async function search({session, search, image, storageIds} = {}) {
  (await findNode('.search-input_upload span.sui-icon-common__wrap')).click();

  const inputSelector = '.search-upload input[type="file"]';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  input.dispatchEvent(new Event('change'));
}

function init() {
  initSearch(search, engine, taskId, {documentVisible: true});
}

if (runOnce('search')) {
  init();
}

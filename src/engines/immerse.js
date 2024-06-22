import {findNode, makeDocumentVisible, runOnce, sleep} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'immerse';

async function search({session, search, image, storageIds}) {
  await sleep(1000);

  (await findNode('img.addUploadPic')).click();

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

import {findNode, runOnce} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'iqdb';

async function search({session, search, image, storageIds}) {
  const inputSelector = '#file';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  (await findNode('form')).submit();
}

function init() {
  initSearch(search, engine, taskId);
}

if (runOnce('search')) {
  init();
}

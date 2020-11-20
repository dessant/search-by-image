import {findNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'iqdb';

async function search({task, search, image, storageKeys}) {
  const inputSelector = '#file';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageKeys);

  (await findNode('form')).submit();
}

function init() {
  initSearch(search, engine, sessionKey);
}

init();

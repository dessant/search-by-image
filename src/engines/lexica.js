import {findNode, executeScriptMainContext, runOnce} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'lexica';

async function search({session, search, image, storageIds} = {}) {
  await executeScriptMainContext({func: 'lexicaOverrideEventDispatch'});

  (await findNode('input#main-search')).nextElementSibling.click();

  const inputSelector = 'input[type="file"]';
  const input = await findNode(inputSelector);

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

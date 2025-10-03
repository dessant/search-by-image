import {findNode, executeScriptMainContext, runOnce} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'alibabaChina';

async function search({session, search, image, storageIds} = {}) {
  await executeScriptMainContext({func: 'alibabaChinaPatchContextScript'});

  const inputSelector = 'input.image-file-reader-wrapper';
  const input = await findNode(inputSelector);

  input.click();

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  window.setTimeout(() => {
    input.dispatchEvent(new Event('change', {bubbles: true}));
  }, 100);
}

function init() {
  initSearch(search, engine, taskId, {canvasAccess: true});
}

if (runOnce('search')) {
  init();
}

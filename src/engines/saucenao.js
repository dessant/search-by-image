import {findNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'saucenao';

async function search({session, search, image, storageIds}) {
  const autoSubmit = await findNode('input#auto-cb');
  if (!autoSubmit.checked) {
    autoSubmit.click();
  }

  const inputSelector = 'input#fileInput';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  input.dispatchEvent(new Event('change'));
}

function init() {
  initSearch(search, engine, taskId);
}

init();

import {findNode, makeDocumentVisible} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'immerse';

async function search({session, search, image, storageIds}) {
  const inputSelector = 'input[type=file]';
  const input = await findNode(inputSelector);

  input.addEventListener('click', ev => ev.preventDefault(), {
    capture: true,
    once: true
  });

  (await findNode('button.drag-drop-btn')).click();

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  input.dispatchEvent(new Event('change'));
}

function init() {
  makeDocumentVisible();
  initSearch(search, engine, taskId);
}

init();

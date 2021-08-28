import {findNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'alibabaChina';

async function search({session, search, image, storageIds}) {
  const button = await findNode('#img-search-btn', {timeout: 120000});

  const inputSelector = 'input[type=file]';
  const input = await findNode(inputSelector);
  input.addEventListener('click', ev => ev.preventDefault(), {
    capture: true,
    once: true
  });

  button.click();

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  window.setTimeout(() => {
    input.dispatchEvent(new Event('change'));
  }, 100);
}

function init() {
  initSearch(search, engine, taskId);
}

init();

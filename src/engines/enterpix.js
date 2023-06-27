import {findNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'enterpix';

async function search({session, search, image, storageIds}) {
  (
    await findNode(
      '.mt-8 > div:nth-child(1) > div:nth-child(1) > div:nth-child(3) > button:nth-child(1)'
    )
  ).click();

  const inputSelector = 'input[type=file]';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  input.dispatchEvent(new Event('change', {bubbles: true}));
}

function init() {
  initSearch(search, engine, taskId);
}

init();

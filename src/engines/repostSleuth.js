import {findNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'repostSleuth';

async function search({session, search, image, storageIds}) {
  if (search.method === 'upload') {
    const inputSelector = 'input[type=file]';
    const input = await findNode(inputSelector);

    await setFileInputData(inputSelector, input, image);

    await sendReceipt(storageIds);

    input.dispatchEvent(new Event('change'));
  } else {
    const input = await findNode('input[placeholder="https://redd.it/xyz"]');

    input.value = image.imageUrl;

    await sendReceipt(storageIds);

    input.dispatchEvent(new Event('input'));
  }

  (await findNode('main button.primary')).click();
}

function init() {
  initSearch(search, engine, taskId);
}

init();

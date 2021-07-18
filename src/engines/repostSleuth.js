import {findNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'repostSleuth';

async function search({task, search, image, storageKeys}) {
  if (search.method === 'upload') {
    const inputSelector = 'input[type=file]';
    const input = await findNode(inputSelector);

    await setFileInputData(inputSelector, input, image);

    await sendReceipt(storageKeys);

    input.dispatchEvent(new Event('change'));
  } else {
    const input = await findNode('input[placeholder="https://redd.it/xyz"]');

    input.value = image.imageUrl;

    await sendReceipt(storageKeys);

    input.dispatchEvent(new Event('input'));
  }

  (await findNode('main button.primary')).click();
}

function init() {
  initSearch(search, engine, sessionKey);
}

init();

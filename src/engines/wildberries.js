import {findNode, runOnce, sleep} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'wildberries';

async function search({session, search, image, storageIds}) {
  // wait for search service to load
  await sleep(1000);

  const button = await findNode('div#searchByImageFormAbNew');
  const isNewSearchForm = !button.classList.contains('hide');

  if (isNewSearchForm) {
    button.click();
  }

  const inputSelector = isNewSearchForm
    ? 'input#popUpFileInput'
    : 'input.j-photo-search__label';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  input.dispatchEvent(new Event('change', {bubbles: true}));

  // wait for image to load
  await sleep(1000);

  (await findNode('button#searchGoodsButton')).click();
}

function init() {
  initSearch(search, engine, taskId);
}

if (runOnce('search')) {
  init();
}

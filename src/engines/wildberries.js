import {findNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'wildberries';

async function search({session, search, image, storageIds}) {
  // wait for search service to load
  await findNode('.chat__footer');

  (
    await findNode('#searchByImageContainer .search-catalog__btn--photo')
  ).click();

  const inputSelector =
    '.search-catalog__photo--active #searchByImageForm input[type=file]';
  const input = await findNode(inputSelector, {
    observerOptions: {attributes: true, attributeFilter: ['class']}
  });

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  input.dispatchEvent(new Event('change'));
}

function init() {
  initSearch(search, engine, taskId);
}

init();

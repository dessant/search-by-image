import {findNode, runOnce} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'pixta';

async function search({session, search, image, storageIds} = {}) {
  const mobileLayout = window.matchMedia('(max-width: 768px)').matches;

  if (mobileLayout) {
    (await findNode('div.global-header-sp i.fa-search')).click();

    (
      await findNode('.global-search-form-sp__search-by-image-btn i.fa-camera')
    ).click();
  } else {
    (
      await findNode('div.search-image-button.search-image-button--top')
    ).click();
  }

  const inputSelector = mobileLayout
    ? 'input#upload-photo[type="file"]'
    : 'input#image[type="file"]';
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

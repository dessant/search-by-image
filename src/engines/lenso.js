import {findNode, runOnce} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'lenso';

async function search({session, search, image, storageIds}) {
  if (search.assetType === 'image') {
    const inputSelector = 'input[type=file]';
    const input = await findNode(inputSelector);

    await setFileInputData(inputSelector, input, image);

    await sendReceipt(storageIds);

    input.dispatchEvent(new Event('change'));

    const modal = await findNode('.manage-consents-modal', {
      timeout: 10000,
      throwError: false
    });

    if (modal) {
      (
        await findNode('label[for="privacy-policy"]', {rootNode: modal})
      ).click();

      (
        await findNode('button.perfom-search-btn:not([disabled])', {
          rootNode: modal,
          observerOptions: {attributes: true}
        })
      ).click();
    }
  } else {
    await sendReceipt(storageIds);

    (
      await findNode('.search-by-url .cta-btn', {
        timeout: 10000,
        throwError: false
      })
    ).click();
  }
}

function init() {
  initSearch(search, engine, taskId);
}

if (runOnce('search')) {
  init();
}

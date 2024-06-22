import {findNode, runOnce} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'branddb';

async function search({session, search, image, storageIds}) {
  await findNode('body[style^="opacity: 1"]', {
    observerOptions: {attributes: true, attributeFilter: ['class']}
  });

  const inputSelector = 'input#fileInput';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  input.dispatchEvent(new Event('change'));

  // wait for image to load
  await findNode('.b-icon--edit');

  await sendReceipt(storageIds);

  window.setTimeout(async () => {
    (
      await findNode(
        'button.search.b-button--is-type_primary:not(.b-button--is-disabled)'
      )
    ).click();
  }, 100);
}

function init() {
  initSearch(search, engine, taskId);
}

if (runOnce('search')) {
  init();
}

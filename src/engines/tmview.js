import {findNode, processNode, runOnce} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'tmview';

async function search({session, search, image, storageIds}) {
  // previous search may be cached
  let removeImage = true;
  processNode(
    '.image-remove button',
    function (node) {
      if (node && removeImage) {
        node.click();
      }
    },
    {throwError: false}
  );

  const inputSelector = 'input[type=file]';
  const input = await findNode(inputSelector);

  removeImage = false;
  await setFileInputData(inputSelector, input, image);

  input.dispatchEvent(new Event('change', {bubbles: true}));

  await findNode('.image-remove button');

  await sendReceipt(storageIds);

  (await findNode('button[data-test-id=search-button]')).click();
}

function init() {
  if (
    !document
      .querySelector('body')
      ?.textContent.toLowerCase()
      .includes('url was rejected')
  ) {
    initSearch(search, engine, taskId);
  }
}

if (runOnce('search')) {
  init();
}

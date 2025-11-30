import {findNode, processNode, runOnce} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'vcg';

async function search({session, search, image, storageIds} = {}) {
  // show image submission popup for visual feedback
  processNode(
    'button[title="以图搜图"]',
    function (node) {
      node.click();
    },
    {throwError: false}
  );

  const inputSelector = 'input[type="file"]';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  window.setTimeout(() => {
    input.dispatchEvent(new Event('change', {bubbles: true}));
  }, 100);
}

async function engineAccess() {
  if (document.title.toLowerCase().includes('security')) {
    return false;
  }

  return true;
}

function init() {
  initSearch(search, engine, taskId, {engineAccess, canvasAccess: true});
}

if (runOnce('search')) {
  init();
}

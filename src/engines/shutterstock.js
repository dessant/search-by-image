import {findNode, isMobile, runOnce} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'shutterstock';

async function search({session, search, image, storageIds} = {}) {
  if (await isMobile()) {
    // some elements are loaded only after the first user interaction
    window.dispatchEvent(new Event('touchstart'));
  }

  (await findNode('.MuiSelect-select[aria-label*="image"]')).dispatchEvent(
    new MouseEvent('mousedown', {bubbles: true})
  );

  (await findNode('li[data-value="reverseImageSearch"]')).click();

  const inputSelector = 'input[type="file"]';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  input.dispatchEvent(new Event('change', {bubbles: true}));
}

async function engineAccess() {
  if (document.querySelector('iframe[src*="captcha-delivery.com"]')) {
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

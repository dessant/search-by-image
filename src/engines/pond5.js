import {findNode, runOnce} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'pond5';

async function search({session, search, image, storageIds} = {}) {
  (
    await findNode('div#main form.SiteSearch button.js-reverseSearchInputIcon')
  ).click();

  const inputSelector = 'input#vissimFileSelector';
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
  initSearch(search, engine, taskId, {engineAccess});
}

if (runOnce('search')) {
  init();
}

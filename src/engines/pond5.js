import {findNode, runOnce} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'pond5';

async function search({session, search, image, storageIds}) {
  // challenge may be added only after page load
  if (document.querySelector('iframe[src*="captcha-delivery.com"]')) {
    return;
  }

  (
    await findNode('div#main form.SiteSearch button.js-reverseSearchInputIcon')
  ).click();

  const inputSelector = 'input#vissimFileSelector';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  input.dispatchEvent(new Event('change', {bubbles: true}));
}

function init() {
  initSearch(search, engine, taskId);
}

if (runOnce('search')) {
  init();
}

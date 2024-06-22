import {findNode, runOnce} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'karmaDecay';

async function search({session, search, image, storageIds}) {
  const inputSelector = 'input#image';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  input.dispatchEvent(new Event('change'));
}

function init() {
  // skip Cloudflare pages
  if (
    !document.body.querySelector('form#challenge-form') ||
    !document.head.querySelector('meta[name="captcha-bypass"]')
  ) {
    initSearch(search, engine, taskId);
  }
}

if (runOnce('search')) {
  init();
}

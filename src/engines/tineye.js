import {findNode, runOnce} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'tineye';

async function search({session, search, image, storageIds}) {
  const inputSelector = 'input#upload-box';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  input.dispatchEvent(new Event('change'));
}

function init() {
  // skip Cloudflare challenge
  if (
    !document
      .querySelector('noscript')
      ?.textContent.includes('<div class="h2"><span id="challenge-error-text">')
  ) {
    initSearch(search, engine, taskId);
  }
}

if (runOnce('search')) {
  init();
}

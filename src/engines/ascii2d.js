import {findNode, runOnce} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'ascii2d';

async function search({session, search, image, storageIds}) {
  const inputSelector = '#file-form';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  (await findNode('#file_upload')).submit();
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

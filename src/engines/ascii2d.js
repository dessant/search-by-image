import {findNode, runOnce} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'ascii2d';

async function search({session, search, image, storageIds} = {}) {
  const inputSelector = '#file-form';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  (await findNode('#file_upload')).submit();
}

async function engineAccess() {
  if (
    // Cloudflare challenge
    document
      .querySelector('noscript')
      ?.textContent.includes(
        '<div class="h2"><span id="challenge-error-text">'
      ) ||
    // Cloudflare error
    document.querySelector('div#cf-wrapper > div#cf-error-details')
  ) {
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

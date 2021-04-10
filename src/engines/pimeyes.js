import {findNode, processNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'pimeyes';

async function search({task, search, image, storageKeys}) {
  document.cookie = `uploadPermissions=${Date.now()}; path=/`;

  const inputSelector = 'input#file-input';

  processNode(inputSelector, function (node) {
    node.addEventListener('click', ev => ev.preventDefault(), {
      capture: true,
      once: true
    });
  });

  (await findNode('.upload-bar button[aria-label="upload photo" i]')).click();

  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageKeys);

  input.dispatchEvent(new Event('change'));
}

function init() {
  initSearch(search, engine, sessionKey);
}

init();

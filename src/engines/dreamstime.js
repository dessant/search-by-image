import {findNode, isMobile} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';
import {targetEnv} from 'utils/config';

const engine = 'dreamstime';

async function search({session, search, image, storageIds}) {
  if (targetEnv === 'safari' && (await isMobile())) {
    // hide noncritical upload error
    const script = document.createElement('script');
    script.textContent = 'window.alert = function () {}';
    document.documentElement.appendChild(script);
    script.remove();
  }

  const inputSelector = 'input.puzzle-file';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  input.dispatchEvent(new Event('change'));
}

function init() {
  initSearch(search, engine, taskId);
}

init();

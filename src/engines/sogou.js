import {findNode, isMobile} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'sogou';

async function search({session, search, image, storageIds}) {
  if (!(await isMobile())) {
    (await findNode('a#cameraIco', {timeout: 120000})).click();
  }

  const inputSelector = 'input[type="file"]';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  input.dispatchEvent(new Event('change'));
}

function init() {
  initSearch(search, engine, taskId);
}

init();

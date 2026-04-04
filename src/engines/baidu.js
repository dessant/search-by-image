import {findNode, runOnce} from 'utils/common';
import {
  initSearch,
  prepareImageForUpload,
  setFileInputData,
  sendReceipt
} from 'utils/engines';

const engine = 'baidu';

async function search({session, search, image, storageIds} = {}) {
  image = await prepareImageForUpload({
    image,
    engine,
    target: 'ui'
  });

  const inputSelector = 'input[type=file]';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  input.dispatchEvent(new Event('change'));
}

function init() {
  initSearch(search, engine, taskId);
}

if (runOnce('search')) {
  init();
}

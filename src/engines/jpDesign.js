import {findNode, runOnce} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'jpDesign';

async function search({session, search, image, storageIds}) {
  // wait for page
  await findNode('#photo > img');

  const inputSelector = '#ImageFile';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  input.dispatchEvent(new Event('change'));

  await findNode('#photo_image');

  await sendReceipt(storageIds);

  (await findNode('#searchForm')).removeAttribute('target');
  (await findNode('.action input[type=submit]')).click();
}

function init() {
  initSearch(search, engine, taskId);
}

if (runOnce('search')) {
  init();
}

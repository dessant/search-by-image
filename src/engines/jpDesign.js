import {findNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'jpDesign';

async function search({task, search, image, storageKeys}) {
  // wait for page
  await findNode('#photo > img');

  const inputSelector = '#ImageFile';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  input.dispatchEvent(new Event('change'));

  await findNode('#photo_image');

  await sendReceipt(storageKeys);

  (await findNode('#searchForm')).removeAttribute('target');
  (await findNode('.action input[type=submit]')).click();
}

function init() {
  initSearch(search, engine, sessionKey);
}

init();

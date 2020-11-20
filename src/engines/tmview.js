import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'tmview';

async function upload({task, search, image}) {
  const inputSelector = 'input#economicDocuments';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  input.dispatchEvent(new Event('change', {bubbles: true}));

  await findNode('img[alt=tmview]');

  (await findNode('button[data-test-id=search-button]')).click();
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

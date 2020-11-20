import {findNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'pond5';

async function search({task, search, image, storageKeys}) {
  (
    await findNode('div#main form.SiteSearch div.js-reverseSearchInputIcon')
  ).click();

  const inputSelector = 'input#vissimFileSelector';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageKeys);

  input.dispatchEvent(new Event('change', {bubbles: true}));
}

function init() {
  initSearch(search, engine, sessionKey);
}

init();

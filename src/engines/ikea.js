import {findNode, processNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'ikea';

async function search({task, search, image, storageKeys}) {
  // go to regional site
  processNode(
    '.region-picker a[data-cy="go-to-website"]',
    node => node.click(),
    {throwError: false}
  );

  (await findNode('#search-box__visualsearch')).click();

  const inputSelector = 'input[type=file]';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageKeys);

  input.dispatchEvent(new Event('change'));
}

function init() {
  initSearch(search, engine, sessionKey);
}

init();

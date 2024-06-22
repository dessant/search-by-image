import {findNode, runOnce, sleep} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'istock';

async function search({session, search, image, storageIds}) {
  // wait for search service to load
  await findNode('#onetrust-consent-sdk');
  await sleep(1000);

  (
    await Promise.race([
      findNode('button[class*="SearchByImageButton"]'),
      findNode('button[data-testid="search-by-image-button"]') // new layout
    ])
  ).click();

  const inputSelector = 'input[type=file]';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  input.dispatchEvent(new Event('change', {bubbles: true}));
}

function init() {
  initSearch(search, engine, taskId);
}

if (runOnce('search')) {
  init();
}

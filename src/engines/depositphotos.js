import {findNode, isMobile} from 'utils/common';
import {validateUrl} from 'utils/app';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'depositphotos';

async function search({session, search, image, storageIds}) {
  if (await isMobile()) {
    const data = new FormData();
    data.append('file', image.imageBlob, image.imageFilename);

    const rsp = await fetch('https://msis.depositphotos.com/search', {
      mode: 'cors',
      method: 'POST',
      body: data
    });

    if (rsp.status !== 200) {
      throw new Error(`API response: ${rsp.status}, ${await rsp.text()}`);
    }

    const results = (await rsp.json()).data.items;
    const ids = encodeURIComponent(results.map(item => item.id).join(','));

    const tabUrl = `https://depositphotos.com/search/by-images.html?idList=[${ids}]`;

    await sendReceipt(storageIds);

    if (validateUrl(tabUrl)) {
      window.location.replace(tabUrl);
    }
  } else {
    (
      await findNode(
        'body:not(.preload) div.enable-transition button.button-search-by-images'
      )
    ).click();

    (await findNode('li[data-key="image"] a.cmp-tabs__label')).click();

    const inputSelector = 'input[type=file]';
    const input = await findNode(inputSelector);

    await setFileInputData(inputSelector, input, image);

    await sendReceipt(storageIds);

    input.dispatchEvent(new Event('change', {bubbles: true}));
  }
}

function init() {
  initSearch(search, engine, taskId);
}

init();

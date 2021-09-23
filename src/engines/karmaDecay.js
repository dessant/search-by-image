import {validateUrl} from 'utils/app';
import {findNode} from 'utils/common';
import {dataTransferConstructor} from 'utils/detect';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'karmaDecay';

async function search({session, search, image, storageIds}) {
  if (!dataTransferConstructor()) {
    const data = new FormData();
    data.append('image', image.imageBlob, image.imageFilename);

    const rsp = await fetch('http://karmadecay.com/index/', {
      mode: 'cors',
      method: 'POST',
      body: data
    });

    if (rsp.status !== 200) {
      throw new Error(`API response: ${rsp.status}, ${await rsp.text()}`);
    }

    const tabUrl = rsp.url;

    await sendReceipt(storageIds);

    if (validateUrl(tabUrl)) {
      window.location.replace(tabUrl);
    }
  } else {
    const inputSelector = 'input#image';
    const input = await findNode(inputSelector);

    await setFileInputData(inputSelector, input, image);

    await sendReceipt(storageIds);

    input.dispatchEvent(new Event('change'));
  }
}

function init() {
  // skip Cloudflare pages
  if (
    !document.body.querySelector('form#challenge-form') ||
    !document.head.querySelector('meta[name="captcha-bypass"]')
  ) {
    initSearch(search, engine, taskId);
  }
}

init();

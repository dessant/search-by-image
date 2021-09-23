import {validateUrl} from 'utils/app';
import {findNode} from 'utils/common';
import {dataTransferConstructor} from 'utils/detect';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'qihoo';

async function search({session, search, image, storageIds}) {
  if (!dataTransferConstructor()) {
    const data = new FormData();
    data.append('upload', image.imageBlob, image.imageFilename);
    data.append('imgurl', '');
    data.append('base64image', '');
    data.append('submittype', 'upload');
    data.append('src', 'st');

    const rsp = await fetch('https://st.so.com/stu', {
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
    let inputSelector;
    let input;
    if (document.head.querySelector('meta[name^="apple-mobile"]')) {
      // mobile
      inputSelector = '#search-box input[type="file"]';
      input = await findNode(inputSelector, {timeout: 120000});
    } else {
      // desktop
      inputSelector = 'input#stUpload';
      input = await findNode(inputSelector);
    }

    await setFileInputData(inputSelector, input, image);

    await sendReceipt(storageIds);

    input.dispatchEvent(new Event('change'));
  }
}

function init() {
  initSearch(search, engine, taskId);
}

init();

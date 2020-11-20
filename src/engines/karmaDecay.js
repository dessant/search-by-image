import {validateUrl} from 'utils/app';
import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';
import {targetEnv} from 'utils/config';

const engine = 'karmaDecay';

async function upload({task, search, image}) {
  if (targetEnv === 'safari') {
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

    if (validateUrl(tabUrl)) {
      window.location.replace(tabUrl);
    }
  } else {
    const inputSelector = 'input#image';
    const input = await findNode(inputSelector);

    await setFileInputData(inputSelector, input, image);

    input.dispatchEvent(new Event('change'));
  }
}

function init() {
  if (
    !document.body.querySelector('form#challenge-form') ||
    !document.head.querySelector('meta[name="captcha-bypass"]')
  ) {
    initUpload(upload, engine, sessionKey);
  }
}

init();

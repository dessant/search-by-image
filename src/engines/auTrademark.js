import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'auTrademark';

async function upload({task, search, image}) {
  const inputSelector = 'input.dz-hidden-input';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  input.dispatchEvent(new Event('change'));

  await findNode('div.cropper-container');

  (
    await findNode('#qa-search-submit:not(.disabled)', {
      observerOptions: {attributes: true, attributeFilter: ['class']}
    })
  ).click();
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

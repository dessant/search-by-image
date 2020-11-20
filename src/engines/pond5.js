import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'pond5';

async function upload({task, search, image}) {
  (
    await findNode('div#main form.SiteSearch div.js-reverseSearchInputIcon')
  ).click();

  const inputSelector = 'input#vissimFileSelector';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  input.dispatchEvent(new Event('change', {bubbles: true}));
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

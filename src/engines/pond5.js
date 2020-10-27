import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'pond5';

async function upload({task, search, image}) {
  (
    await findNode('div#main form.SiteSearch div.js-reverseSearchInputIcon')
  ).click();

  const input = await findNode('input#vissimFileSelector');

  setFileInputData(input, image);

  input.dispatchEvent(new Event('change', {bubbles: true}));
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

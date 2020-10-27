import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'qihoo';

async function upload({task, search, image}) {
  let input;
  if (document.head.querySelector('meta[name^="apple-mobile"]')) {
    input = await findNode('#search-box input[type="file"]', {timeout: 120000});
  } else {
    (await findNode('#iconSt', {timeout: 120000})).click();

    input = await findNode('input#stUpload');
  }

  setFileInputData(input, image);

  input.dispatchEvent(new Event('change'));
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

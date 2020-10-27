import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'sogou';

async function upload({task, search, image}) {
  let input;
  if (document.head.querySelector('link[href^="/mobile/"]')) {
    input = await findNode('#uploadFormWrapper input[type="file"]', {
      timeout: 120000
    });
  } else {
    (await findNode('a#stswitcher', {timeout: 120000})).click();

    input = await findNode('input#upload_pic_file');
  }

  setFileInputData(input, image);

  input.dispatchEvent(new Event('change'));
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

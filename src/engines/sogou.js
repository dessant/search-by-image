import {findNode, isAndroid} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'sogou';

async function upload({task, search, image}) {
  let inputSelector;
  let input;

  if (await isAndroid()) {
    inputSelector = 'input[type="file"]';
    input = await findNode(inputSelector, {timeout: 120000});
  } else {
    (await findNode('a#stswitcher', {timeout: 120000})).click();

    inputSelector = 'input#upload_pic_file';
    input = await findNode(inputSelector);
  }

  await setFileInputData(inputSelector, input, image);

  input.dispatchEvent(new Event('change'));
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

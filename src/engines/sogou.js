import {findNode, isAndroid} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'sogou';

async function search({task, search, image, storageKeys}) {
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

  await sendReceipt(storageKeys);

  input.dispatchEvent(new Event('change'));
}

function init() {
  initSearch(search, engine, sessionKey);
}

init();

import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'alibabaChina';

async function upload({task, search, image}) {
  const button = await findNode('#img-search-btn', {timeout: 120000});

  const inputSelector = 'input[type=file]';
  const input = await findNode(inputSelector);
  input.addEventListener('click', ev => ev.preventDefault(), {
    capture: true,
    once: true
  });

  button.click();

  await setFileInputData(inputSelector, input, image);

  window.setTimeout(() => {
    input.dispatchEvent(new Event('change'));
  }, 100);
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'alibabaChina';

async function upload({task, search, image}) {
  const button = await findNode('#img-search-btn', {timeout: 120000});

  const input = await findNode('input[type=file]');
  input.addEventListener('click', ev => ev.preventDefault(), {
    capture: true,
    once: true
  });

  button.click();

  setFileInputData(input, image);

  window.setTimeout(() => {
    input.dispatchEvent(new Event('change'));
  }, 100);
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

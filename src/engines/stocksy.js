import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'stocksy';

async function upload({task, search, image}) {
  (await findNode('button[id$="btn-visual-search"]')).click();

  await findNode('#vs-modal[aria-hidden="false"]', {
    observerOptions: {attributes: true, attributeFilter: ['aria-hidden']}
  });

  const input = await findNode('input#vs-file');

  setFileInputData(input, image);

  input.dispatchEvent(new Event('change'));
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

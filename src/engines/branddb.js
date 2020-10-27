import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'branddb';

async function upload({task, search, image}) {
  await Promise.race([
    findNode('tr[id="0"]'), // desktop
    findNode('.flowItemBox .flowItem[foo="0"]') // mobile
  ]);

  (await findNode('a[href="#image_filter"]')).click();

  await findNode('.fileTarget-open');

  const input = await findNode('input#imageFileUpload');
  setFileInputData(input, image);

  input.dispatchEvent(new Event('change'));

  // wait for image to load
  await findNode('.ui-icon-pencil');

  // select Concept strategy
  (await findNode('a[data-hasqtip="52"]')).click();

  window.setTimeout(async () => {
    (await findNode('#image_filter .addFilterButton')).click();
  }, 100);
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

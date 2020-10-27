import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'madridMonitor';

async function upload({task, search, image}) {
  (await findNode('#imageModeLink')).click();

  await findNode('.fileTarget-open');

  const input = await findNode('input#imageFileUpload');
  setFileInputData(input, image);

  input.dispatchEvent(new Event('change'));

  // wait for image to load
  await findNode('.ui-icon-pencil');

  // select Concept strategy
  (await findNode('a[data-hasqtip="81"]')).click();

  // deselect all image types
  (await findNode('a[data-hasqtip="87"]')).click();
  (await findNode('a[data-hasqtip="88"]')).click();

  window.setTimeout(async () => {
    (
      await findNode('#image_search_container .searchButtonContainer a')
    ).click();
  }, 100);
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

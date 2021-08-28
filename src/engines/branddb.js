import {findNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'branddb';

async function search({session, search, image, storageIds}) {
  await Promise.race([
    findNode('tr[id="0"]'), // desktop
    findNode('.flowItemBox .flowItem[foo="0"]') // mobile
  ]);

  (await findNode('a[href="#image_filter"]')).click();

  await findNode('.fileTarget-open');

  const inputSelector = 'input#imageFileUpload';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  input.dispatchEvent(new Event('change'));

  // wait for image to load
  await findNode('.ui-icon-pencil');

  // select Concept strategy
  (await findNode('a[data-hasqtip="52"]')).click();

  await sendReceipt(storageIds);

  window.setTimeout(async () => {
    (await findNode('#image_filter .addFilterButton')).click();
  }, 100);
}

function init() {
  initSearch(search, engine, taskId);
}

init();

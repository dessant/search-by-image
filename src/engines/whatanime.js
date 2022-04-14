import {findNode} from 'utils/common';
import {initSearch, sendReceipt} from 'utils/engines';
import {convertImage} from 'utils/app';

const engine = 'whatanime';

async function search({session, search, image, storageIds}) {
  const convImageDataUrl = await convertImage(image.imageDataUrl, {
    type: 'image/jpeg',
    maxSize: 640
  });

  await sendReceipt(storageIds);

  (await findNode('#autoSearch')).checked = true;
  (await findNode('#originalImage')).src = convImageDataUrl;
}

function init() {
  initSearch(search, engine, taskId);
}

init();

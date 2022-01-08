import {findNode} from 'utils/common';
import {initSearch, sendReceipt} from 'utils/engines';
import {resizeImage} from 'utils/app';

const engine = 'whatanime';

async function search({session, search, image, storageIds}) {
  const resizedImage = await resizeImage({
    dataUrl: image.imageDataUrl,
    type: 'image/jpeg',
    maxSize: 640
  });

  await sendReceipt(storageIds);

  (await findNode('#autoSearch')).checked = true;
  (await findNode('#originalImage')).src = resizedImage.imageDataUrl;
}

function init() {
  initSearch(search, engine, taskId);
}

init();

import {findNode} from 'utils/common';
import {getDataTransfer, initUpload} from 'utils/engines';

const engine = 'tmview';

async function upload({task, search, image}) {
  const dataTransfer = getDataTransfer();
  const fileData = new File([image.imageBlob], image.imageFilename, {
    type: image.imageType
  });
  dataTransfer.items.add(fileData);

  const dropZone = await findNode('.content .container');

  dropZone.dispatchEvent(new DragEvent('drop', {dataTransfer}));

  await findNode('img[alt=tmview]');

  (await findNode('button[data-test-id=search-button]')).click();
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

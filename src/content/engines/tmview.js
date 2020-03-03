const engine = 'tmview';

async function upload({blob, imgData}) {
  const dataTransfer = getDataTransfer();
  const fileData = new File([blob], imgData.filename, {type: blob.type});
  dataTransfer.items.add(fileData);

  const dropZone = await findNode('.content .container');

  dropZone.dispatchEvent(new DragEvent('drop', {dataTransfer}));

  await findNode('img[alt=tmview]');

  (await findNode('button[data-test-id=search-button]')).click();
}

initUpload(upload, dataKey, engine);

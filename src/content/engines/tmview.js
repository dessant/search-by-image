const engine = 'tmview';

async function upload({blob, imgData}) {
  const dropZone = await waitForElement('.content .container');
  const fileData = new File([blob], imgData.filename, {type: blob.type});
  const dataTransfer = getDataTransfer();
  dataTransfer.items.add(fileData);
  dropZone.dispatchEvent(new DragEvent('drop', {dataTransfer}));

  await waitForElement('img[alt=tmview]');

  (await waitForElement('button[data-test-id=search-button]')).click();
}

initUpload(upload, dataKey, engine);

const engine = 'mailru';

async function upload({blob, imgData}) {
  (await findNode('button.MainSearchFieldContainer-buttonCamera')).click();

  const dataTransfer = getDataTransfer();
  const fileData = new File([blob], imgData.filename, {type: blob.type});
  dataTransfer.items.add(fileData);

  const dropZone = await findNode('#ImageUploadBlock-dropZone');

  dropZone.dispatchEvent(new DragEvent('drop', {dataTransfer}));
}

initUpload(upload, dataKey, engine);

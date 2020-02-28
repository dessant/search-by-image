const engine = 'mailru';

async function upload({blob, imgData}) {
  const button = await waitForElement(
    'button.MainSearchFieldContainer-buttonCamera'
  );
  button.click();

  const dropZone = await waitForElement('#ImageUploadBlock-dropZone');

  const fileData = new File([blob], imgData.filename, {type: blob.type});
  const dataTransfer = getDataTransfer();
  dataTransfer.items.add(fileData);

  const event = new DragEvent('drop', {dataTransfer});
  dropZone.dispatchEvent(event);
}

initUpload(upload, dataKey, engine);

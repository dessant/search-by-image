const engine = 'mailru';

async function upload({blob, imgData}) {
  (await findNode('button.MainSearchFieldContainer-buttonCamera')).click();

  const input = await findNode('#ImageUploadBlock-inputFile');
  setFileInputData(input, blob, imgData);

  input.dispatchEvent(new Event('change', {bubbles: true}));
}

initUpload(upload, dataKey, engine);

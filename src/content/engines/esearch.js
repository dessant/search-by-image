const engine = 'esearch';

async function upload({blob, imgData}) {
  const input = await findNode('input.fileUploader-basic');
  setFileInputData(input, blob, imgData);

  input.dispatchEvent(new Event('change'));

  await findNode('div.imageViewer');

  (await findNode('#basicSearchBigButton')).click();
}

initUpload(upload, dataKey, engine);

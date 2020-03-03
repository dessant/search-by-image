const engine = 'istock';

async function upload({blob, imgData}) {
  (await findNode('a.search-camera-icon')).click();

  const input = await findNode('input[type=file]');
  setFileInputData(input, blob, imgData);

  input.dispatchEvent(new Event('change'));
}

initUpload(upload, dataKey, engine);

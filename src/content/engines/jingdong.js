const engine = 'jingdong';

async function upload({blob, imgData}) {
  const input = await findNode('input.upload-trigger', {timeout: 10000});
  setFileInputData(input, blob, imgData);

  input.dispatchEvent(new Event('change'));
}

initUpload(upload, dataKey, engine);

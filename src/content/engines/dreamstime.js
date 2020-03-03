const engine = 'dreamstime';

async function upload({blob, imgData}) {
  const input = await findNode('input.puzzle-file');
  setFileInputData(input, blob, imgData);

  input.dispatchEvent(new Event('change'));
}

initUpload(upload, dataKey, engine);

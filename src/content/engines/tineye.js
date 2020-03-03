const engine = 'tineye';

async function upload({blob, imgData}) {
  const input = await findNode('input#upload_box');
  setFileInputData(input, blob, imgData);

  input.dispatchEvent(new Event('change'));
}

initUpload(upload, dataKey, engine);

const engine = 'jingdong';

async function upload({blob, imgData}) {
  const input = document.querySelector('input.upload-trigger');
  if (!input) {
    throw new Error('input field missing');
  }

  setFileInputData(input, blob, imgData);

  const event = new Event('change');
  input.dispatchEvent(event);
}

initUpload(upload, dataKey, engine);

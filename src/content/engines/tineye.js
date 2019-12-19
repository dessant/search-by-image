const engine = 'tineye';

async function upload({blob, imgData}) {
  const input = await waitForElement('input#upload_box');
  if (!input) {
    throw new Error('input field missing');
  }

  setFileInputData(input, blob, imgData);

  const event = new Event('change');
  input.dispatchEvent(event);
}

initUpload(upload, dataKey, engine);

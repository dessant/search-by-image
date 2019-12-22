const engine = 'dreamstime';

async function upload({blob, imgData}) {
  const input = await waitForElement('input.puzzle-file');
  if (!input) {
    throw new Error('input field missing');
  }

  setFileInputData(input, blob, imgData);

  const event = new Event('change');
  input.dispatchEvent(event);
}

initUpload(upload, dataKey, engine);

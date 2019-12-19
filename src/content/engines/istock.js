const engine = 'istock';

async function upload({blob, imgData}) {
  document.querySelector('a.search-camera-icon').click();
  const input = await waitForElement('input[type=file]');
  if (!input) {
    throw new Error('input field missing');
  }

  setFileInputData(input, blob, imgData);

  const event = new Event('change');
  input.dispatchEvent(event);
}

initUpload(upload, dataKey, engine);

const engine = 'istock';

async function upload({blob, imgData}) {
  document.querySelector('a.search-camera-icon').click();
  const input = await waitForElement('input[type=file]');
  if (!input) {
    throw new Error('input field missing');
  }

  const fileData = new File([blob], imgData.filename, {type: blob.type});
  try {
    setFileInputData(input, fileData, engine);
  } catch (err) {
    return;
  }

  const event = new Event('change');
  input.dispatchEvent(event);
}

initUpload(upload, dataKey, engine);

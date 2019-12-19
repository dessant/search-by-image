const engine = 'adobestock';

async function upload({blob, imgData}) {
  document.querySelector('i.js-camera-icon').click();
  const input = await waitForElement('#js-vsupload');
  if (!input) {
    throw new Error('input field missing');
  }

  setFileInputData(input, blob, imgData);

  const event = new Event('change');
  input.dispatchEvent(event);
}

initUpload(upload, dataKey, engine);

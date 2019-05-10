const engine = 'adobestock';

async function upload({blob, imgData}) {
  document.querySelector('i.js-camera-icon').click();
  const input = await waitForElement('#js-vsupload');
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

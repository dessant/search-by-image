const engine = 'tineye';

async function upload({blob, imgData}) {
  const input = await waitForElement('input#upload_box');
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

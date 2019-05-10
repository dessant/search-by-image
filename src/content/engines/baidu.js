const engine = 'baidu';

async function upload({blob, imgData}) {
  const button = await waitForElement('a#sttb', 120000);
  button.click();

  const input = await waitForElement('input#stfile');
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

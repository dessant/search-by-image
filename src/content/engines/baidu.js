const engine = 'baidu';

async function upload({blob, imgData}) {
  const button = await waitForElement('a#sttb', 120000);
  button.click();

  const input = await waitForElement('input#stfile');
  if (!input) {
    throw new Error('input field missing');
  }

  setFileInputData(input, blob, imgData);

  const event = new Event('change');
  input.dispatchEvent(event);
}

initUpload(upload, dataKey, engine);

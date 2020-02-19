const engine = 'bing';

async function upload({blob, imgData}) {
  const button = await waitForElement('#sb_sbi', 60000);
  button.click();

  const input = await waitForElement('input#sb_fileinput');

  setFileInputData(input, blob, imgData);

  const event = new Event('change');
  input.dispatchEvent(event);
}

initUpload(upload, dataKey, engine);

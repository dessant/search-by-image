const engine = 'esearch';

async function upload({blob, imgData}) {
  const input = await waitForElement('input.fileUploader-basic');
  setFileInputData(input, blob, imgData);
  input.dispatchEvent(new Event('change'));

  await waitForElement('div.imageViewer');

  (await waitForElement('#basicSearchBigButton')).click();
}

initUpload(upload, dataKey, engine);

const engine = 'auDesign';

async function upload({blob, imgData}) {
  const input = await waitForElement('input[type=file]');
  setFileInputData(input, blob, imgData);
  input.dispatchEvent(new Event('change'));

  (await waitForElement('.popup-content .buttons button')).click();
  (await waitForElement('.as-search-button')).click();
}

initUpload(upload, dataKey, engine);

const engine = 'alamy';

async function upload({blob, imgData}) {
  document.querySelector('div.visual-image-search-holder').click();
  const input = await waitForElement('#fileupload');
  if (!input) {
    throw new Error('input field missing');
  }

  setFileInputData(input, blob, imgData);

  const event = new Event('change');
  input.dispatchEvent(event);
}

initUpload(upload, dataKey, engine);

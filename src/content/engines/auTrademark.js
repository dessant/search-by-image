const engine = 'auTrademark';

async function upload({blob, imgData}) {
  const input = await waitForElement('input.dz-hidden-input');
  setFileInputData(input, blob, imgData);
  input.dispatchEvent(new Event('change'));

  await waitForElement('div.cropper-container');
  (
    await waitForElement('#qa-search-submit:not(.disabled)', {
      observerOptions: {attributes: true, attributeFilter: ['class']}
    })
  ).click();
}

initUpload(upload, dataKey, engine);

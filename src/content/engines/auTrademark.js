const engine = 'auTrademark';

async function upload({blob, imgData}) {
  const input = await findNode('input.dz-hidden-input');
  setFileInputData(input, blob, imgData);

  input.dispatchEvent(new Event('change'));

  await findNode('div.cropper-container');

  (
    await findNode('#qa-search-submit:not(.disabled)', {
      observerOptions: {attributes: true, attributeFilter: ['class']}
    })
  ).click();
}

initUpload(upload, dataKey, engine);

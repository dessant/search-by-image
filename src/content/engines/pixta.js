const engine = 'pixta';

async function upload({blob, imgData}) {
  (await findNode('div.search-form__search-by-image')).click();

  const input = await findNode('input#image[type="file"]');

  setFileInputData(input, blob, imgData);

  input.dispatchEvent(new Event('change'));
}

initUpload(upload, dataKey, engine);

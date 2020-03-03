const engine = 'auDesign';

async function upload({blob, imgData}) {
  const input = await findNode('input[type=file]');
  setFileInputData(input, blob, imgData);

  input.dispatchEvent(new Event('change'));

  (await findNode('.popup-content .buttons button')).click();
  (await findNode('.as-search-button')).click();
}

initUpload(upload, dataKey, engine);

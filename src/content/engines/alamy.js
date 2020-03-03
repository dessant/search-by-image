const engine = 'alamy';

async function upload({blob, imgData}) {
  (await findNode('div.visual-image-search-holder')).click();

  const input = await findNode('#fileupload');
  setFileInputData(input, blob, imgData);

  input.dispatchEvent(new Event('change'));
}

initUpload(upload, dataKey, engine);

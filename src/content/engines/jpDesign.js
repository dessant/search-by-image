const engine = 'jpDesign';

async function upload({blob, imgData}) {
  const input = await findNode('#ImageFile');
  setFileInputData(input, blob, imgData);

  input.dispatchEvent(new Event('change'));

  await findNode('#photo_image');

  (await findNode('#searchForm')).removeAttribute('target');
  (await findNode('.action input[type=submit]')).click();
}

initUpload(upload, dataKey, engine);

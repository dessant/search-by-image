const engine = 'jpDesign';

async function upload({blob, imgData}) {
  const input = await waitForElement('#ImageFile');
  setFileInputData(input, blob, imgData);
  input.dispatchEvent(new Event('change'));

  await waitForElement('#photo_image');

  (await waitForElement('#searchForm')).removeAttribute('target');
  (await waitForElement('.action input[type=submit]')).click();
}

initUpload(upload, dataKey, engine);

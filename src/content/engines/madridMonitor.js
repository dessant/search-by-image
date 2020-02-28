const engine = 'madridMonitor';

async function upload({blob, imgData}) {
  (await waitForElement('#imageModeLink')).click();
  await waitForElement('.fileTarget-open');

  const input = await waitForElement('input#imageFileUpload');
  setFileInputData(input, blob, imgData);
  input.dispatchEvent(new Event('change'));

  await waitForElement('.ui-icon-pencil');

  (await waitForElement('a[data-hasqtip="79"]')).click();
  (await waitForElement('a[data-hasqtip="84"]')).click();

  (
    await waitForElement('#image_search_container .searchButtonContainer a')
  ).click();
}

initUpload(upload, dataKey, engine);

const engine = 'madridMonitor';

async function upload({blob, imgData}) {
  (await findNode('#imageModeLink')).click();

  await findNode('.fileTarget-open');

  const input = await findNode('input#imageFileUpload');
  setFileInputData(input, blob, imgData);

  input.dispatchEvent(new Event('change'));

  await findNode('.ui-icon-pencil');

  (await findNode('a[data-hasqtip="79"]')).click();
  (await findNode('a[data-hasqtip="84"]')).click();

  window.setTimeout(async () => {
    (
      await findNode('#image_search_container .searchButtonContainer a')
    ).click();
  }, 100);
}

initUpload(upload, dataKey, engine);

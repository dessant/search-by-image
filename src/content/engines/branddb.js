const engine = 'branddb';

async function upload({blob, imgData}) {
  await waitForElement('tr[id="0"]');

  (await waitForElement('a[href="#image_filter"]')).click();
  await waitForElement('.fileTarget-open');

  const input = await waitForElement('input#imageFileUpload');
  setFileInputData(input, blob, imgData);
  input.dispatchEvent(new Event('change'));

  await waitForElement('.ui-icon-pencil');

  (await waitForElement('a[data-hasqtip="52"]')).click();

  window.setTimeout(async () => {
    (await waitForElement('#image_filter .addFilterButton')).click();
  }, 100);
}

initUpload(upload, dataKey, engine);

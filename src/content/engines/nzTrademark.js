const engine = 'nzTrademark';

async function upload({blob, imgData}) {
  (await waitForElement('#logoCheckButton')).click();

  const input = await waitForElement('#imageSearchDialogUploadButton');
  setFileInputData(input, blob, imgData);
  input.dispatchEvent(new Event('change'));

  (
    await waitForElement('#imageSearchDialogNextButton:not([disabled])', {
      observerOptions: {attributes: true, attributeFilter: ['disabled']}
    })
  ).click();

  const features = await waitForElement(
    '#imageSearchDialogMainStep1_2:not(.hidden)',
    {
      timeout: 30000,
      observerOptions: {attributes: true, attributeFilter: ['class']}
    }
  );
  if (features) {
    (
      await waitForElement('#imageSearchDialogNextButton:not([disabled])', {
        observerOptions: {attributes: true, attributeFilter: ['disabled']}
      })
    ).click();
  }
}

initUpload(upload, dataKey, engine);

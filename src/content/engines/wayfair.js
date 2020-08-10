const engine = 'wayfair';

async function upload({blob, imgData}) {
  (
    await findNode('nav.Header-primaryNav button.SearchWithPhotoButton')
  ).click();

  const input = await findNode('input#FileUpload-input0');

  setFileInputData(input, blob, imgData);

  input.dispatchEvent(new Event('change', {bubbles: true}));
}

initUpload(upload, dataKey, engine);

const engine = 'taobao';

async function upload({blob, imgData}) {
  const button = await waitForElement('div.drop-wrapper');

  const input = await waitForElement('input#J_IMGSeachUploadBtn');
  input.addEventListener('click', e => e.preventDefault(), {
    capture: true,
    once: true
  });

  button.click();

  setFileInputData(input, blob, imgData);

  const event = new Event('change');
  input.dispatchEvent(event);
}

initUpload(upload, dataKey, engine);

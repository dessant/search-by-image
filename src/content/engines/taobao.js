const engine = 'taobao';

async function upload({blob, imgData}) {
  const button = await waitForElement('div.drop-wrapper', 60000);

  const input = await waitForElement('input#J_IMGSeachUploadBtn');
  input.addEventListener('click', e => e.preventDefault(), {
    capture: true,
    once: true
  });

  button.click();

  const fileData = new File([blob], imgData.filename, {type: blob.type});
  try {
    setFileInputData(input, fileData, engine);
  } catch (err) {
    return;
  }

  const event = new Event('change');
  input.dispatchEvent(event);
}

initUpload(upload, dataKey, engine);

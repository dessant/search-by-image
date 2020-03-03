const engine = 'taobao';

async function upload({blob, imgData}) {
  const button = await findNode('div.drop-wrapper', {timeout: 120000});

  const input = await findNode('input#J_IMGSeachUploadBtn');
  input.addEventListener('click', e => e.preventDefault(), {
    capture: true,
    once: true
  });

  button.click();

  setFileInputData(input, blob, imgData);

  input.dispatchEvent(new Event('change'));
}

initUpload(upload, dataKey, engine);

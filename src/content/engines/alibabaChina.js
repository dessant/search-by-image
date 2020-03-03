const engine = 'alibabaChina';

async function upload({blob, imgData}) {
  const button = await findNode('#img-search-btn', {timeout: 120000});

  const input = await findNode('input[type=file]');
  input.addEventListener('click', e => e.preventDefault(), {
    capture: true,
    once: true
  });

  button.click();

  setFileInputData(input, blob, imgData);

  window.setTimeout(() => {
    input.dispatchEvent(new Event('change'));
  }, 100);
}

initUpload(upload, dataKey, engine);

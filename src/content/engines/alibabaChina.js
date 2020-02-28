const engine = 'alibabaChina';

async function upload({blob, imgData}) {
  const button = await waitForElement('#img-search-btn');

  const input = await waitForElement('input[type=file]');
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

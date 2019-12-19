const engine = 'alibabaChina';

async function upload({blob, imgData}) {
  const button = await waitForElement('span#sm-widget-picbtn', 60000);

  const input = await waitForElement('input[type=file]');
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

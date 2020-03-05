const engine = 'yandex';

async function upload({blob, imgData}) {
  const button = await findNode('.input__cbir-button');
  const desktopButton = button.querySelector('button');

  let input;
  if (desktopButton) {
    desktopButton.click();

    input = await findNode('.cbir-panel__file-input');
  } else {
    input = await findNode('.cbir-uploader__file-input');
  }

  setFileInputData(input, blob, imgData);

  input.dispatchEvent(new Event('change'));
}

initUpload(upload, dataKey, engine);

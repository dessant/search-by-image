const engine = 'pimeyes';

async function upload({blob, imgData}) {
  document.cookie = `uploadPermissions=${Date.now()}; path=/`;

  (await findNode('.upload-bar button[aria-label="upload photo" i]')).click();

  const input = await findNode('input#file-input');

  setFileInputData(input, blob, imgData);

  input.dispatchEvent(new Event('change'));
}

initUpload(upload, dataKey, engine);

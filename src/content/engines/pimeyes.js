const engine = 'pimeyes';

async function upload({blob, imgData}) {
  document.cookie = `uploadPermissions=${Date.now()}; path=/`;

  const script = document.createElement('script');
  script.textContent = `window.env.FORCE_CAMERA_ONLY = false;`;
  document.documentElement.appendChild(script);
  script.remove();

  (await findNode('#search-action span[aria-label="upload photo" i]')).click();

  const input = await findNode('input[type="file"]');

  setFileInputData(input, blob, imgData);

  input.dispatchEvent(new Event('change'));
}

initUpload(upload, dataKey, engine);

const engine = 'adobestock';

async function upload({blob, imgData}) {
  (await findNode('i.js-camera-icon')).click();

  const input = await findNode('#js-vsupload');
  setFileInputData(input, blob, imgData);

  input.dispatchEvent(new Event('change'));
}

initUpload(upload, dataKey, engine);

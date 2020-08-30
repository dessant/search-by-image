const engine = 'shutterstock';

async function upload({blob, imgData}) {
  (
    await findNode('button[data-track-label="reverseImageSearchButton"]')
  ).click();

  const input = await findNode('input[type="file"]');

  setFileInputData(input, blob, imgData);

  input.dispatchEvent(new Event('change', {bubbles: true}));
}

initUpload(upload, dataKey, engine);

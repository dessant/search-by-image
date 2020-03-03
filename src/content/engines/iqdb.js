const engine = 'iqdb';

async function upload({blob, imgData}) {
  const input = await findNode('#file');
  setFileInputData(input, blob, imgData);

  (await findNode('form')).submit();
}

initUpload(upload, dataKey, engine);

const engine = 'ascii2d';

async function upload({blob, imgData}) {
  const input = await findNode('#file-form');
  setFileInputData(input, blob, imgData);

  (await findNode('#file_upload')).submit();
}

initUpload(upload, dataKey, engine);

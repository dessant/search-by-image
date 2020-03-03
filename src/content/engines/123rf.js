const engine = '123rf';

async function upload({blob, imgData}) {
  (await findNode('#cam_sim')).click();

  const input = await findNode('#file_upload');
  setFileInputData(input, blob, imgData);

  (await findNode('#btn_submit2')).click();
}

initUpload(upload, dataKey, engine);

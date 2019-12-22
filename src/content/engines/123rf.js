const engine = '123rf';

async function upload({blob, imgData}) {
  document.querySelector('#cam_sim').click();
  const input = await waitForElement('#file_upload');
  if (!input) {
    throw new Error('input field missing');
  }

  setFileInputData(input, blob, imgData);

  document.querySelector('#btn_submit2').click();
}

initUpload(upload, dataKey, engine);

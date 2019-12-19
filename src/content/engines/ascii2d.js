const engine = 'ascii2d';

async function upload({blob, imgData}) {
  const input = document.querySelector('#file-form');
  if (!input) {
    throw new Error('input field missing');
  }

  setFileInputData(input, blob, imgData);

  document.querySelector('#file_upload').submit();
}

initUpload(upload, dataKey, engine);

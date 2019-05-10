const engine = 'ascii2d';

async function upload({blob, imgData}) {
  const input = document.querySelector('#file-form');
  if (!input) {
    throw new Error('input field missing');
  }

  const fileData = new File([blob], imgData.filename, {type: blob.type});
  try {
    setFileInputData(input, fileData, engine);
  } catch (err) {
    return;
  }

  document.querySelector('#file_upload').submit();
}

initUpload(upload, dataKey, engine);

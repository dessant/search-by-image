const engine = 'iqdb';

async function upload({blob, imgData}) {
  const input = document.querySelector('#file');
  if (!input) {
    throw new Error('input field missing');
  }

  const fileData = new File([blob], imgData.filename, {type: blob.type});
  try {
    setFileInputData(input, fileData, engine);
  } catch (err) {
    return;
  }

  document.querySelector('form').submit();
}

initUpload(upload, dataKey, engine);

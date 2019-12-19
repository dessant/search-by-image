const engine = 'iqdb';

async function upload({blob, imgData}) {
  const input = document.querySelector('#file');
  if (!input) {
    throw new Error('input field missing');
  }

  setFileInputData(input, blob, imgData);

  document.querySelector('form').submit();
}

initUpload(upload, dataKey, engine);

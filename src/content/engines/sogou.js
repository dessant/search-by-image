const engine = 'sogou';

async function upload({blob, imgData}) {
  document.querySelector('a#stswitcher').click();
  const input = document.querySelector('input#upload_pic_file');
  if (!input) {
    throw new Error('input field missing');
  }

  setFileInputData(input, blob, imgData);

  const event = new Event('change');
  input.dispatchEvent(event);
}

initUpload(upload, dataKey, engine);

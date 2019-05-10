const engine = 'sogou';

async function upload({blob, imgData}) {
  document.querySelector('a#stswitcher').click();
  const input = document.querySelector('input#upload_pic_file');
  if (!input) {
    throw new Error('input field missing');
  }

  const fileData = new File([blob], imgData.filename, {type: blob.type});
  try {
    setFileInputData(input, fileData, engine);
  } catch (err) {
    return;
  }

  const event = new Event('change');
  input.dispatchEvent(event);
}

initUpload(upload, dataKey, engine);

const engine = 'qihoo';

async function upload({blob, imgData}) {
  if (blob) {
    const input = document.querySelector('input#stUpload');
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
  } else {
    document.querySelector('input#stInput').value = imgData.url;
    document.querySelector('input.st_submit').click();
  }
}

initUpload(upload, dataKey, engine);

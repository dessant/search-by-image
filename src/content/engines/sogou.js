const engine = 'sogou';

async function upload({blob, imgData}) {
  (await findNode('a#stswitcher', {timeout: 120000})).click();

  const input = await findNode('input#upload_pic_file');
  setFileInputData(input, blob, imgData);

  input.dispatchEvent(new Event('change'));
}

initUpload(upload, dataKey, engine);

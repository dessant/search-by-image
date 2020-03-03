const engine = 'bing';

async function upload({blob, imgData}) {
  (await findNode('#sb_sbi')).click();

  const input = await findNode('input#sb_fileinput');
  setFileInputData(input, blob, imgData);

  input.dispatchEvent(new Event('change'));
}

initUpload(upload, dataKey, engine);

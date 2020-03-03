const engine = 'qihoo';

async function upload({blob, imgData}) {
  if (blob) {
    const input = await findNode('input#stUpload', {timeout: 120000});
    setFileInputData(input, blob, imgData);

    input.dispatchEvent(new Event('change'));
  } else {
    (await findNode('input#stInput')).value = imgData.url;

    (await findNode('input.st_submit')).click();
  }
}

initUpload(upload, dataKey, engine);

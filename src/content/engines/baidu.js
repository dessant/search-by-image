const engine = 'baidu';

async function upload({blob, imgData}) {
  (await findNode('.soutu-btn', {timeout: 120000})).click();

  if (blob) {
    const input = await findNode('input.upload-pic');
    setFileInputData(input, blob, imgData);

    input.dispatchEvent(new Event('change'));
  } else {
    const input = await findNode('input#soutu-url-kw');
    input.value = imgData.url;

    (await findNode('.soutu-url-btn')).click();
  }
}

initUpload(upload, dataKey, engine);

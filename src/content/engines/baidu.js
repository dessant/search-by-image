const engine = 'baidu';

async function upload({blob, imgData}) {
  const button = await waitForElement('.soutu-btn', {timeout: 120000});
  button.click();

  if (blob) {
    const input = await waitForElement('input.upload-pic');
    if (!input) {
      throw new Error('input field missing');
    }

    setFileInputData(input, blob, imgData);

    const event = new Event('change');
    input.dispatchEvent(event);
  } else {
    const input = await waitForElement('input#soutu-url-kw');
    if (!input) {
      throw new Error('input field missing');
    }

    input.value = imgData.url;

    const submit = await waitForElement('.soutu-url-btn');
    submit.click();
  }
}

initUpload(upload, dataKey, engine);

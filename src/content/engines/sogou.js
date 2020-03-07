const engine = 'sogou';

async function upload({blob, imgData}) {
  let input;
  if (document.head.querySelector('link[href^="/mobile/"]')) {
    input = await findNode('#uploadFormWrapper input[type="file"]', {
      timeout: 120000
    });
  } else {
    (await findNode('a#stswitcher', {timeout: 120000})).click();

    input = await findNode('input#upload_pic_file');
  }

  setFileInputData(input, blob, imgData);

  input.dispatchEvent(new Event('change'));
}

initUpload(upload, dataKey, engine);

const engine = 'qihoo';

async function upload({blob, imgData}) {
  let input;
  if (document.head.querySelector('meta[name^="apple-mobile"]')) {
    input = await findNode('#search-box input[type="file"]', {timeout: 120000});
  } else {
    (await findNode('#iconSt', {timeout: 120000})).click();

    input = await findNode('input#stUpload');
  }

  setFileInputData(input, blob, imgData);

  input.dispatchEvent(new Event('change'));
}

initUpload(upload, dataKey, engine);

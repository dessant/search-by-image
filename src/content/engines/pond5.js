const engine = 'pond5';

async function upload({blob, imgData}) {
  (
    await findNode('div#main form.SiteSearch div.js-reverseSearchInputIcon')
  ).click();

  const input = await findNode('input#vissimFileSelector');

  setFileInputData(input, blob, imgData);

  input.dispatchEvent(new Event('change', {bubbles: true}));
}

initUpload(upload, dataKey, engine);

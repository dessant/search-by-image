const engine = 'stocksy';

async function upload({blob, imgData}) {
  (await findNode('button[id$="btn-visual-search"]')).click();

  await findNode('#vs-modal[aria-hidden="false"]', {
    observerOptions: {attributes: true, attributeFilter: ['aria-hidden']}
  });

  const input = await findNode('input#vs-file');

  setFileInputData(input, blob, imgData);

  input.dispatchEvent(new Event('change'));
}

initUpload(upload, dataKey, engine);

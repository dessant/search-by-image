async function upload({blob, imgData}) {
  const form = document.createElement('form');
  form.setAttribute('data-c45ng3u9', '');
  form.id = 'sbi-upload-form';
  form.method = 'POST';
  form.enctype = 'multipart/form-data';
  form.action =
    'https://www.bing.com/images/search?q=&view=detailv2&iss=sbiupload&FORM=IRSBIQ&redirecturl=https%3A%2F%2Fwww.bing.com%2Fimages%2Fdiscover%3Fform%3DHDRSC2#enterInsights';

  const reader = new FileReader();
  reader.onload = function(e) {
    const input = document.createElement('input');
    input.setAttribute('data-c45ng3u9', '');
    input.name = 'imageBin';
    input.type = 'hidden';

    input.value = e.target.result.substring(e.target.result.indexOf(',') + 1);
    form.appendChild(input);

    document.body.appendChild(form);
    form.submit();
  };
  reader.readAsDataURL(blob);
}

initUpload(upload, dataKey);

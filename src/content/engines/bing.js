function upload(dataUri) {
  const form = document.createElement('form');
  form.setAttribute('data-c45ng3u9', '');
  form.id = 'sbi-upload-form';
  form.method = 'POST';
  form.enctype = 'multipart/form-data';
  form.action =
    'https://www.bing.com/images/search?q=&view=detailv2&iss=sbiupload&FORM=IRSBIQ&redirecturl=https%3A%2F%2Fwww.bing.com%2Fimages%2Fdiscover%3Fform%3DHDRSC2#enterInsights';

  const input = document.createElement('input');
  input.setAttribute('data-c45ng3u9', '');
  input.name = 'imageBin';
  input.type = 'hidden';
  input.value = dataUri.data.substring(dataUri.data.indexOf(',') + 1);
  form.appendChild(input);

  document.body.appendChild(form);
  form.submit();
}

function onMessage(request, sender, sendResponse) {
  if (request.id === 'dataUriResponse') {
    if (request.hasOwnProperty('error')) {
      console.log(request.error);
    } else {
      upload(request.dataUri);
    }
  }
}

browser.runtime.onMessage.addListener(onMessage);
browser.runtime.sendMessage({id: 'dataUriRequest', dataKey: dataKey});

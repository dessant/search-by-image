const engine = 'bing';

async function upload({blob, imgData}) {
  const form = document.createElement('form');
  form.setAttribute('data-c45ng3u9', '');
  form.id = 'sbi-upload-form';
  form.method = 'POST';
  form.enctype = 'multipart/form-data';
  form.action =
    `https://www.bing.com/images/search?q=&view=detailv2&iss=sbiupload` +
    `&FORM=IRSBIQ&sbifnm=${imgData.filename}&redirecturl=https%3A%2F%2F` +
    `www.bing.com%2Fimages%2Fdiscover%3Fform%3DHDRSC2#enterInsights`;

  const input = document.createElement('input');
  input.setAttribute('data-c45ng3u9', '');
  input.name = 'imageBin';
  input.type = 'hidden';

  form.appendChild(input);
  document.body.appendChild(form);

  if (blob.size > 600 * 1024) {
    const img = new Image();
    img.onload = function() {
      const cnv = document.createElement('canvas');
      const ctx = cnv.getContext('2d');

      const maxSize = 800;
      const sw = img.naturalWidth;
      const sh = img.naturalHeight;
      let dw;
      let dh;
      if (sw > maxSize || sh > maxSize) {
        if (sw === sh) {
          dw = dh = maxSize;
        }
        if (sw > sh) {
          dw = maxSize;
          dh = (sh / sw) * maxSize;
        }
        if (sw < sh) {
          dw = (sw / sh) * maxSize;
          dh = maxSize;
        }
      } else {
        dw = sw;
        dh = sh;
      }

      cnv.width = dw;
      cnv.height = dh;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, dw, dh);
      ctx.drawImage(img, 0, 0, sw, sh, 0, 0, dw, dh);
      const data = cnv.toDataURL('image/jpeg', 0.8);

      input.value = data.substring(data.indexOf(',') + 1);
      form.submit();
    };
    img.src = URL.createObjectURL(blob);
  } else {
    const reader = new FileReader();
    reader.onload = function(e) {
      input.value = e.target.result.substring(e.target.result.indexOf(',') + 1);
      form.submit();
    };
    reader.readAsDataURL(blob);
  }
}

initUpload(upload, dataKey, engine);

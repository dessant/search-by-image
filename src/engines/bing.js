import {findNode, isAndroid} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'bing';

async function upload({task, search, image}) {
  if (await isAndroid()) {
    const form = document.createElement('form');
    form.setAttribute('data-c45ng3u9', '');
    form.id = 'sbi-upload-form';
    form.method = 'POST';
    form.enctype = 'multipart/form-data';
    form.action = `https://www.bing.com/images/search?view=detailv2&iss=sbiupload&FORM=SBIHMP&sbifnm=${image.imageFilename}`;

    const input = document.createElement('input');
    input.setAttribute('data-c45ng3u9', '');
    input.name = 'imageBin';
    input.type = 'hidden';

    form.appendChild(input);
    document.body.appendChild(form);

    if (image.imageSize > 600 * 1024) {
      const img = new Image();
      img.onload = function () {
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
      img.src = URL.createObjectURL(image.imageBlob);
    } else {
      input.value = image.imageDataUrl.substring(
        image.imageDataUrl.indexOf(',') + 1
      );
      form.submit();
    }
  } else {
    (await findNode('#sb_sbi')).click();

    const inputSelector = 'input#sb_fileinput';
    const input = await findNode(inputSelector);

    await setFileInputData(inputSelector, input, image);

    input.dispatchEvent(new Event('change'));
  }
}

function init() {
  initUpload(upload, engine, sessionKey);
}

init();

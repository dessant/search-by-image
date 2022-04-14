import {findNode, isMobile} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';
import {convertImage} from 'utils/app';

const engine = 'bing';

async function search({session, search, image, storageIds}) {
  if (await isMobile()) {
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

    await sendReceipt(storageIds);

    if (image.imageSize > 600 * 1024) {
      const convImageDataUrl = await convertImage(image.imageDataUrl, {
        type: 'image/jpeg',
        maxSize: 640
      });

      input.value = convImageDataUrl.substring(
        convImageDataUrl.indexOf(',') + 1
      );
      form.submit();
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

    await sendReceipt(storageIds);

    input.dispatchEvent(new Event('change'));
  }
}

function init() {
  initSearch(search, engine, taskId);
}

init();

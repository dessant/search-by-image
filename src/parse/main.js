import browser from 'webextension-polyfill';
import _ from 'lodash';

import {validateUrl} from 'utils/app';

const cssProperties = ['background-image', 'border-image-source', 'mask-image'];
const pseudoSelectors = ['::before', '::after'];
const replacedElements = ['IMG', 'VIDEO', 'IFRAME', 'EMBED'];
const rxCssUrl = /url\(['"]?([^'")]+)['"]?\)/gi;

function getFilename(url) {
  const file = url
    .split('/')
    .pop()
    .replace(/(?:#|\?).*?$/, '')
    .split('.');
  let filename = '';
  let ext = '';
  if (file.length === 1) {
    filename = file[0];
  } else {
    filename = file.join('.');
    ext = file.pop().toLowerCase();
  }

  return {filename, ext};
}

function getImageElement(url) {
  return new Promise(resolve => {
    let img = document.querySelector(`img[src="${url}"]`);
    if (img && img.complete && img.naturalWidth) {
      resolve(img);
    }
    img = new Image();
    img.onload = () => {
      resolve(img);
    };
    img.onerror = () => {
      resolve();
    };
    img.src = url;
  });
}

function extractCSSImages(cssProps, node, pseudo = null) {
  if (pseudo) {
    cssProps = cssProps.slice();
    cssProps.push('content');
  }

  const urls = [];
  const style = window.getComputedStyle(node, pseudo);

  let match;

  cssProperties.forEach(function(prop) {
    let value = style.getPropertyValue(prop);
    if (value && value !== 'none') {
      while ((match = rxCssUrl.exec(value)) !== null) {
        urls.push({data: match[1]});
      }
    }
  });

  return urls;
}

async function parseNode(node) {
  const urls = [];
  const nodeName = node.nodeName;
  let cssProps = cssProperties;

  switch (nodeName) {
    case 'IMG':
      if (node.src) {
        urls.push({data: node.src});
      } else {
        if (node.currentSrc) {
          urls.push({data: node.currentSrc});
        }
      }
      break;
    case 'VIDEO':
      if (node.poster) {
        urls.push({data: node.poster});
      }
      break;
    case 'LI':
      cssProps = cssProps.slice();
      cssProps.push('list-style-image');
      break;
  }

  urls.push(...extractCSSImages(cssProps, node));

  if (!replacedElements.includes(nodeName)) {
    pseudoSelectors.forEach(function(pseudo) {
      urls.push(...extractCSSImages(cssProps, node, pseudo));
    });
  }

  return urls;
}

async function parseDocument() {
  if (typeof clickTarget === 'undefined' || !clickTarget.node) {
    throw new Error('');
  }

  let urls = [];
  const targetNode = clickTarget.node;

  if (!document.querySelector('html')) {
    return urls;
  }

  urls.push(...(await parseNode(targetNode)));

  if (targetNode.nodeName !== 'IMG' || frameStore.options.imgFullParse) {
    const fullParseUrls = [];

    const clickRectBottom = clickTarget.uy + 24;
    const clickRectTop = clickTarget.uy - 24;
    const clickRectLeft = clickTarget.ux - 24;
    const clickRectRight = clickTarget.ux + 24;

    const nodes = document.getElementsByTagName('*');
    const nodeCount = nodes.length;

    for (let i = 0; i < nodeCount; i++) {
      let currentNode = nodes[i];

      let nodeRect = currentNode.getBoundingClientRect();
      if (
        clickRectBottom < nodeRect.top + window.scrollY ||
        clickRectTop > nodeRect.bottom + window.scrollY ||
        clickRectLeft > nodeRect.right + window.scrollX ||
        clickRectRight < nodeRect.left + window.scrollX
      ) {
        continue;
      }

      if (!currentNode.isSameNode(targetNode)) {
        fullParseUrls.push(...(await parseNode(currentNode)));
      }
    }

    urls.push(...fullParseUrls.reverse());
  }

  urls = _.uniqBy(urls, 'data');

  const isLocalDoc = window.location.href.startsWith('file://');
  if (isLocalDoc) {
    const fileUrls = urls.filter(item => item.data.startsWith('file://'));
    if (fileUrls.length) {
      const cnv = document.createElement('canvas');
      const ctx = cnv.getContext('2d');
      for (const item of fileUrls) {
        const url = item.data;
        const img = await getImageElement(url);
        if (img) {
          const {filename, ext} = getFilename(url);
          const type = ['jpg', 'jpeg', 'jpe'].includes(ext)
            ? 'image/jpeg'
            : 'image/png';
          cnv.width = img.naturalWidth;
          cnv.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);
          const data = cnv.toDataURL(type, 0.8);
          ctx.clearRect(0, 0, cnv.width, cnv.height);

          urls[urls.indexOf(item)] = {data, filename};
        }
      }
    }
  }

  const blobUrls = urls.filter(item => item.data.startsWith('blob:'));
  if (blobUrls.length) {
    const cnv = document.createElement('canvas');
    const ctx = cnv.getContext('2d');
    for (const item of blobUrls) {
      const img = await getImageElement(item.data);
      if (img) {
        cnv.width = img.naturalWidth;
        cnv.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        const data = cnv.toDataURL('image/png');
        ctx.clearRect(0, 0, cnv.width, cnv.height);

        urls[urls.indexOf(item)] = {data};
      }
    }
  }

  return urls.filter(
    item => item.data.startsWith('data:image/') || validateUrl(item.data)
  );
}

self.initParse = async function initParse() {
  const images = await parseDocument().catch(err => {
    console.log(err);
    browser.runtime.sendMessage({
      id: 'pageParseError'
    });
  });
  if (images) {
    browser.runtime.sendMessage({
      id: 'pageParseSubmit',
      engine: frameStore.data.engine,
      images
    });
  }
};

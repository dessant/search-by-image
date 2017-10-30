const cssProperties = ['background-image', 'border-image-source', 'mask-image'];
const pseudoSelectors = ['::before', '::after'];
const replacedElements = ['IMG', 'VIDEO', 'IFRAME', 'EMBED'];
const rxCssUrl = /url\(['"]?([^'")]+)['"]?\)/gi;
const rxSupportedUrls = /^(?:https?:\/\/|ftp:\/\/|data:image\/).*$/i;
const canvas = {cnv: null, ctx: null};

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

function parseNode(node, isLocalDoc) {
  const urls = [];
  const nodeName = node.nodeName;
  let cssProps = cssProperties;

  switch (nodeName) {
    case 'IMG':
      if (node.src) {
        urls.push({data: node.src});
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

  if (isLocalDoc) {
    const fileUrls = urls.filter(item => item.data.startsWith('file://'));
    const {cnv, ctx} = canvas;
    fileUrls.forEach(function(item) {
      const url = item.data;
      let img = document.querySelector(`img[src="${url}"]`);
      if (!img) {
        img = new Image();
        img.src = url;
        const startTime = new Date().getTime();
        while (true) {
          if (
            img.complete ||
            img.naturalWidth ||
            new Date().getTime() - startTime > 120000
          ) {
            break;
          }
        }
      }

      const {filename, ext} = getFilename(url);
      const type = ['jpg', 'jpeg', 'jpe'].includes(ext)
        ? 'image/jpeg'
        : 'image/png';

      cnv.width = img.naturalWidth;
      cnv.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      const data = cnv.toDataURL(type, 1.0);
      ctx.clearRect(0, 0, cnv.width, cnv.height);

      urls[urls.indexOf(item)] = {data, filename};
    });
  }

  return urls;
}

function parseDocument() {
  if (typeof clickTarget === 'undefined' || !clickTarget.node) {
    return null;
  }

  const urls = [];
  const targetNode = clickTarget.node;
  const isLocalDoc = window.location.href.startsWith('file://');

  if (!document.querySelector('html')) {
    return urls;
  }

  if (isLocalDoc && !canvas.cnv) {
    canvas.cnv = document.createElement('canvas');
    canvas.ctx = canvas.cnv.getContext('2d');
  }

  urls.push(...parseNode(targetNode, isLocalDoc));

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
        fullParseUrls.push(...parseNode(currentNode, isLocalDoc));
      }
    }

    urls.push(...fullParseUrls.reverse());
  }

  return urls.filter(url => rxSupportedUrls.test(url.data));
}

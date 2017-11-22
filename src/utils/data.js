import browser from 'webextension-polyfill';

const optionKeys = [
  'engines',
  'disabledEngines',
  'showInContextMenu',
  'searchAllEnginesContextMenu',
  'searchAllEnginesAction',
  'tabInBackgound',
  'localGoogle',
  'imgFullParse',
  'searchModeAction'
];

const engines = {
  google: {
    url: 'https://www.google.com/searchbyimage?image_url={imgUrl}',
    upload: `${browser.extension.getURL(
      '/src/upload/index.html'
    )}?engine=google&dataKey={dataKey}`
  },
  bing: {
    url:
      'https://www.bing.com/images/search?q=imgurl:{imgUrl}&view=detailv2' +
      '&iss=sbi&FORM=IRSBIQ&redirecturl=https%3A%2F%2Fwww.bing.com' +
      '%2Fimages%2Fdiscover%3Fform%3DHDRSC2#enterInsights',
    upload: 'https://www.bing.com/images/discover?form=HDRSC2'
  },
  yandex: {
    url: 'https://yandex.com/images/search?img_url={imgUrl}&rpt=imageview',
    upload: 'https://yandex.com/images/'
  },
  baidu: {
    url:
      'https://image.baidu.com/n/pc_search' +
      '?queryImageUrl={imgUrl}&fm=index&uptype=paste',
    upload: 'http://image.baidu.com/'
  },
  tineye: {
    url: 'https://www.tineye.com/search/?&url={imgUrl}',
    upload: `${browser.extension.getURL(
      '/src/upload/index.html'
    )}?engine=tineye&dataKey={dataKey}`
  },
  sogou: {
    url: 'https://pic.sogou.com/ris?query={imgUrl}&flag=1&drag=0',
    upload: 'http://pic.sogou.com/'
  }
};

const imageMimeTypes = {
  'image/bmp': 'bmp',
  'image/cgm': 'cgm',
  'image/g3fax': 'g3',
  'image/gif': 'gif',
  'image/ief': 'ief',
  'image/jpeg': 'jpg',
  'image/ktx': 'ktx',
  'image/png': 'png',
  'image/prs.btif': 'btif',
  'image/sgi': 'sgi',
  'image/svg+xml': 'svg',
  'image/tiff': 'tiff',
  'image/vnd.adobe.photoshop': 'psd',
  'image/vnd.dece.graphic': 'uvi',
  'image/vnd.djvu': 'djvu',
  'image/vnd.dvb.subtitle': 'sub',
  'image/vnd.dwg': 'dwg',
  'image/vnd.dxf': 'dxf',
  'image/vnd.fastbidsheet': 'fbs',
  'image/vnd.fpx': 'fpx',
  'image/vnd.fst': 'fst',
  'image/vnd.fujixerox.edmics-mmr': 'mmr',
  'image/vnd.fujixerox.edmics-rlc': 'rlc',
  'image/vnd.ms-modi': 'mdi',
  'image/vnd.ms-photo': 'wdp',
  'image/vnd.net-fpx': 'npx',
  'image/vnd.wap.wbmp': 'wbmp',
  'image/vnd.xiff': 'xif',
  'image/webp': 'webp',
  'image/x-3ds': '3ds',
  'image/x-cmu-raster': 'ras',
  'image/x-cmx': 'cmx',
  'image/x-freehand': 'fh',
  'image/x-icon': 'ico',
  'image/x-jng': 'jng',
  'image/x-mrsid-image': 'sid',
  'image/x-ms-bmp': 'bmp',
  'image/x-pcx': 'pcx',
  'image/x-pict': 'pic',
  'image/x-portable-anymap': 'pnm',
  'image/x-portable-bitmap': 'pbm',
  'image/x-portable-graymap': 'pgm',
  'image/x-portable-pixmap': 'ppm',
  'image/x-rgb': 'rgb',
  'image/x-tga': 'tga',
  'image/x-xbitmap': 'xbm',
  'image/x-xpixmap': 'xpm',
  'image/x-xwindowdump': 'xwd'
};

module.exports = {
  optionKeys,
  engines,
  imageMimeTypes
};

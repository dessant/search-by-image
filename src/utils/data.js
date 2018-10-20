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
  'searchModeAction',
  'searchModeContextMenu'
];

const uploadUrl =
  browser.extension.getURL('/src/upload/index.html') +
  '?engine={engine}&dataKey={dataKey}';

const resultsUrl =
  browser.extension.getURL('/src/results/index.html') +
  '?engine={engine}&dataKey={dataKey}';

const engines = {
  google: {
    url: {target: 'https://www.google.com/searchbyimage?image_url={imgUrl}'},
    upload: {
      target: uploadUrl,
      isDataKey: true
    }
  },
  bing: {
    url: {
      target:
        'https://www.bing.com/images/search?q=imgurl:{imgUrl}&view=detailv2' +
        '&iss=sbi&FORM=IRSBIQ&redirecturl=https%3A%2F%2Fwww.bing.com' +
        '%2Fimages%2Fdiscover%3Fform%3DHDRSC2#enterInsights'
    },
    upload: {
      target: 'https://www.bing.com/images/discover?form=HDRSC2',
      isExec: true
    }
  },
  yandex: {
    url: {
      target: 'https://yandex.com/images/search?img_url={imgUrl}&rpt=imageview'
    },
    upload: {
      target: 'https://yandex.com/images/',
      isExec: true
    }
  },
  baidu: {
    url: {
      target:
        'https://image.baidu.com/n/pc_search' +
        '?queryImageUrl={imgUrl}&fm=index&uptype=paste'
    },
    upload: {
      target: 'http://image.baidu.com/',
      isExec: true
    }
  },
  tineye: {
    url: {target: 'https://www.tineye.com/search/?&url={imgUrl}'},
    upload: {
      target: uploadUrl,
      isDataKey: true
    }
  },
  sogou: {
    url: {target: 'https://pic.sogou.com/ris?query={imgUrl}&flag=1&drag=0'},
    upload: {
      target: 'http://pic.sogou.com/',
      isExec: true
    }
  },
  karmaDecay: {
    url: {target: 'http://karmadecay.com/search?q={imgUrl}'},
    upload: {
      target: uploadUrl,
      isDataKey: true
    }
  },
  whatanime: {
    url: {target: 'https://whatanime.ga/?url={imgUrl}'},
    upload: {
      target: 'https://whatanime.ga/',
      isExec: true
    }
  },
  saucenao: {
    url: {target: 'https://saucenao.com/search.php?url={imgUrl}'},
    upload: {
      target: uploadUrl,
      isDataKey: true
    }
  },
  iqdb: {
    url: {target: 'https://iqdb.org/?url={imgUrl}'},
    upload: {
      target: 'https://iqdb.org/',
      isExec: true
    }
  },
  ascii2d: {
    url: {target: 'https://ascii2d.net/search/url/{imgUrl}'},
    upload: {
      target: 'https://ascii2d.net/',
      isExec: true
    }
  },
  getty: {
    upload: {
      target: 'https://www.gettyimages.com/',
      isExec: true
    }
  },
  istock: {
    upload: {
      target: 'https://www.istockphoto.com/',
      isExec: true
    }
  },
  shutterstock: {
    upload: {
      target: uploadUrl,
      isDataKey: true
    }
  },
  adobestock: {
    upload: {
      target: 'https://stock.adobe.com/',
      isExec: true
    }
  },
  depositphotos: {
    upload: {
      target: 'https://depositphotos.com/',
      isExec: true
    }
  },
  pinterest: {
    url: {
      target: resultsUrl,
      isDataKey: true
    },
    upload: {
      target: resultsUrl,
      isDataKey: true
    }
  },
  qihoo: {
    url: {
      target: 'https://st.so.com/',
      isExec: true
    },
    upload: {
      target: 'https://st.so.com/',
      isExec: true
    }
  }
};

// https://github.com/jshttp/mime-db
const imageMimeTypes = {
  'image/apng': 'apng',
  'image/bmp': 'bmp',
  'image/cgm': 'cgm',
  'image/g3fax': 'g3',
  'image/gif': 'gif',
  'image/ief': 'ief',
  'image/jp2': 'jp2',
  'image/jpeg': 'jpg',
  'image/jpm': 'jpm',
  'image/jpx': 'jpx',
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
  'image/vnd.microsoft.icon': 'ico',
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

const chromeUA =
  'Mozilla/5.0 (Linux; Android 7.0; SM-G930V Build/NRD90M) AppleWebKit/' +
  '537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Mobile Safari/537.36';

export {optionKeys, engines, imageMimeTypes, chromeUA};

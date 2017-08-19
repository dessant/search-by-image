const optionKeys = [
  'engines',
  'disabledEngines',
  'tabInBackgound',
  'localGoogle',
  'searchAllEnginesContextMenu',
  'imgFullParse'
];

const engines = {
  google: {
    url: 'https://www.google.com/searchbyimage?image_url={imgUrl}'
  },
  bing: {
    url:
      'https://www.bing.com/images/search?q=imgurl:{imgUrl}&view=detailv2&iss=sbi&FORM=IRSBIQ&redirecturl=https%3A%2F%2Fwww.bing.com%2Fimages%2Fdiscover%3Fform%3DHDRSC2#enterInsights',
    data: 'https://www.bing.com/images/discover?form=HDRSC2'
  },
  yandex: {
    url: 'https://yandex.com/images/search?img_url={imgUrl}&rpt=imageview',
    data: 'https://yandex.com/images/'
  },
  baidu: {
    url:
      'https://image.baidu.com/n/pc_search?queryImageUrl={imgUrl}&fm=index&uptype=paste'
  },
  tineye: {
    url: 'https://www.tineye.com/search/?&url={imgUrl}'
  },
  sogou: {
    url: 'https://pic.sogou.com/ris?query={imgUrl}&flag=1&drag=0',
    data: 'http://pic.sogou.com/'
  }
};

module.exports = {
  optionKeys,
  engines
};

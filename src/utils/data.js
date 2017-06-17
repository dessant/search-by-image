var optionKeys = [
  'engines',
  'disabledEngines',
  'tabInBackgound',
  'localGoogle',
  'searchAllEngines',
  'searchAllEnginesLocation'
];

var engines = {
  google: {
    url: 'https://www.google.com/searchbyimage?image_url={imgUrl}'
  },
  bing: {
    url: 'https://www.bing.com/images/searchbyimage?FORM=IRSBIQ&cbir=sbi&imgurl={imgUrl}'
  },
  yandex: {
    url: 'https://yandex.com/images/search?img_url={imgUrl}&rpt=imageview'
  },
  baidu: {
    url: 'https://image.baidu.com/n/pc_search?queryImageUrl={imgUrl}&fm=index&uptype=paste'
  },
  tineye: {
    url: 'https://www.tineye.com/search/?&url={imgUrl}'
  }
};

module.exports = {
  optionKeys,
  engines
};

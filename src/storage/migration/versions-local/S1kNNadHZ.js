var message = 'Add Sogou engine';

var revision = 'S1kNNadHZ';
var downRevision = 'Hy1tD8ANb';

var storage = browser.storage.local;

async function upgrade() {
  var changes = {};
  var {engines, disabledEngines} = await storage.get([
    'engines',
    'disabledEngines'
  ]);

  changes.engines = engines.concat('sogou');
  changes.disabledEngines = disabledEngines.concat('sogou');

  changes.storageVersion = revision;
  return storage.set(changes);
}

async function downgrade() {
  var changes = {};
  var {engines, disabledEngines} = await storage.get([
    'engines',
    'disabledEngines'
  ]);

  changes.engines = engines.filter(function(item) {
    return item !== 'sogou';
  });
  changes.disabledEngines = disabledEngines.filter(function(item) {
    return item !== 'sogou';
  });

  changes.storageVersion = downRevision;
  return storage.set(changes);
}

module.exports = {
  message,
  revision,
  upgrade,
  downgrade
};

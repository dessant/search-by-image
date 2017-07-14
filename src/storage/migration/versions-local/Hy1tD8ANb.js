var message = 'Add imgFullParse option';

var revision = 'Hy1tD8ANb';
var downRevision = 'ryekyizAg';

var storage = browser.storage.local;

async function upgrade() {
  var changes = {imgFullParse: false};

  changes.storageVersion = revision;
  return storage.set(changes);
}

async function downgrade() {
  var changes = {};
  await storage.remove('imgFullParse');

  changes.storageVersion = downRevision;
  return storage.set(changes);
}

module.exports = {
  message,
  revision,
  upgrade,
  downgrade
};

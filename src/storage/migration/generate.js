var path = require('path');
var program = require('commander');
var shortid = require('shortid');
var fs = require('fs-extra');
var _ = require('lodash');

program
  .description('Saves a new storage revision in the versions folder.')
  .option('-m, --message <value>', 'Revision description')
  .option(
    '-s, --storage <value>',
    'Storage area',
    /^(local|sync|managed)$/i,
    'sync'
  )
  .parse(process.argv);

if (!process.argv.slice(2).length) {
  program.help();
}

var message = program.message;
var storageArea = program.storage;

var revisionId = shortid.generate();

var versionsDir = path.join(__dirname, `versions-${storageArea}`);
var versionsFile = path.join(versionsDir, 'versions.json');

fs.ensureDirSync(versionsDir);

try {
  var versions = fs.readJsonSync(versionsFile);
  var downRevisionId = `'${_.last(versions.versions)}'`;
} catch (err) {
  var versions = {versions: []};
  var downRevisionId = null;
}
versions.versions.push(revisionId);

revisionCont = `var message = '${message}';

var revision = '${revisionId}';
var downRevision = ${downRevisionId};

var storage = browser.storage.${storageArea};

async function upgrade() {
  var changes = {};

  changes.storageVersion = revision;
  return storage.set(changes);
}

async function downgrade() {
  var changes = {};

  changes.storageVersion = downRevision;
  return storage.set(changes);
}

module.exports = {
  message,
  revision,
  upgrade,
  downgrade
};
`;

fs.writeFileSync(path.join(versionsDir, `${revisionId}.js`), revisionCont);
fs.writeJsonSync(versionsFile, versions);

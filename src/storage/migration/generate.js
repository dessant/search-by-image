// $ node src/storage/migration/generate.js -m "Revision description"

const path = require('path');
const program = require('commander');
const shortid = require('shortid');
const fs = require('fs-extra');
const _ = require('lodash');

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

const message = program.message;
const storageArea = program.storage;

const revisionId = shortid.generate();

const versionsDir = path.join(__dirname, `versions-${storageArea}`);
const versionsFile = path.join(versionsDir, 'versions.json');

fs.ensureDirSync(versionsDir);

let versions;
let downRevisionId;
try {
  versions = fs.readJsonSync(versionsFile);
  downRevisionId = `'${_.last(versions.versions)}'`;
} catch (err) {
  versions = {versions: []};
  downRevisionId = null;
}
versions.versions.push(revisionId);

revisionCont = `import browser from 'webextension-polyfill';

const message = '${message}';

const revision = '${revisionId}';
const downRevision = ${downRevisionId};

const storage = browser.storage.${storageArea};

async function upgrade() {
  const changes = {};

  changes.storageVersion = revision;
  return storage.set(changes);
}

async function downgrade() {
  const changes = {};

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

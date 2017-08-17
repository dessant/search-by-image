import _ from 'lodash';

async function storageVersion(area = 'local') {
  const options = await browser.storage[area].get(['storageVersion']);
  if (!_.isEmpty(options)) {
    return options.storageVersion;
  }
}

async function latestVersion(area = 'local') {
  const versions = await getVersions(area);
  return _.last(versions.versions);
}

async function isLatestVersion(area = 'local') {
  return (await storageVersion(area)) === (await latestVersion(area));
}

async function getVersions(area = 'local') {
  return require(`./versions-${area}/versions.json`);
}

async function upgrade(area = 'local', toVer) {
  const versions = (await getVersions(area)).versions;
  if (_.isUndefined(toVer)) {
    toVer = _.last(versions);
  }
  const fromVer = await storageVersion(area);

  if (fromVer === toVer) {
    return;
  }

  const migrationPath = _.slice(
    versions,
    _.indexOf(versions, fromVer) + 1,
    _.indexOf(versions, toVer) + 1
  );

  console.log(`Migrating storage (${area}): ${fromVer} => ${toVer}`);

  for (const revisionId of migrationPath) {
    const revision = require(`./versions-${area}/${revisionId}.js`);
    console.log(
      `Applying revision (${area}): ${revision.revision} - ${revision.message}`
    );
    await revision.upgrade();
  }
}

async function reconcile(area = 'local') {
  return upgrade(area);
}

module.exports = {
  reconcile
};

const targetEnv = process.env.TARGET_ENV;

const enableContributions = process.env.ENABLE_CONTRIBUTIONS === 'true';

const storageRevisions = {local: process.env.STORAGE_REVISION_LOCAL};

export {targetEnv, enableContributions, storageRevisions};

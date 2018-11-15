#!/usr/bin/env node
const { spawn } = require('child_process');

const DEFAULT_MAX_RETRIES = 100;
const DEFAULT_MS_BETWEEN_RETRIES = 2000;


/**
 * @typedef {object} DockerHealthLogItem
 * @property {string} Start - date format
 * @property {string} End - date format
 * @property {number} ExitCode
 * @property {string} Output
 */

/**
 * @typedef {object} DockerHealth
 * @property {string} Status - starting, healthy, unhealthy
 * @property {number} FailingStreak
 * @property {DockerHealthLogItem[]} Log
 */

/**
 * Use docker CLI to get container health
 *
 * @async
 * @param {string} container
 * @return {Promise<DockerHealth>}
 */
async function getContainerHealth(container) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', ['inspect', "--format='{{json .State.Health}}'", container]);
    const stdout = [];
    const stderr = [];

    child.stdout.on('data', data => stdout.push(String(data).trim()));
    child.stderr.on('data', data => stderr.push(String(data).trim()));

    child.on('close', (code) => {
      if (code === 0) {
        // child_process wraps in single quotes, which must be removed to be valid JSON
        const rawHealth = stdout[0].substring(1, stdout[0].length - 1);
        const health = JSON.parse(rawHealth);
        return resolve(health);
      }
      return reject(stderr.join('\n'));
    })
  });
}

/**
 * Wait for milliseconds to pass
 * @async
 * @param {number} ms
 * @return {Promise<void>}
 */
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Resolve a promise when Docker container has passed HEALTHCHECK (Status = healthy)
 *
 * @async
 * @param {string} container - the docker container to wait for
 * @param {number} [maxRetries=100] - times to try before rejecting the promise
 * @param {number} [msBetweenRetries=2000] - seconds to wait between retries
 * @return {Promise<string>} resolves to success message
 */
async function waitForDockerHealth({
  container,
  maxRetries = DEFAULT_MAX_RETRIES,
  msBetweenRetries = DEFAULT_MS_BETWEEN_RETRIES
}) {
  if (!container) {
    throw new Error('container must be specified');
  }

  console.debug(`Waiting for container = ${container} state to be healthy`);
  const start = new Date();
  for (let i = 0; i < maxRetries; i += 1) {
    let Status;
    try {
      ({ Status } = await getContainerHealth(container));
    } catch (err) {
      console.warn(err.message || err);
      console.log(`Will retry in ${msBetweenRetries / 1000}s`);
    }

    const end = new Date();
    if (Status === 'healthy') {
      return `Docker container = ${container} is healthy (took ${(end - start) / 1000}s)`;
    } else if (Status === 'unhealthy') {
      throw new Error(`Docker container ${container} is unhealthy (took ${(end - start) / 1000}s)`)
    }
    await sleep(msBetweenRetries);
  }

  throw new Error(`Shards on ${container} did not settle in ${msBetweenRetries / 1000 * maxRetries}s`);
}


if (require.main === module) {
  waitForDockerHealth({
    container: process.argv[2],
    maxRetries: process.argv[3],
    msBetweenRetries: process.argv[4],
  })
    .then(out => console.log(out))
    .catch((err) => {
      console.error(err.message || err);
      process.exit(1);
    });
}

module.exports = waitForDockerHealth;

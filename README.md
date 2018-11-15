# wait-for-docker-health
Wait for Docker HEALTHCHECKs to pass

Requires the Docker CLI.

## Usage
### CLI

#### `wait-for-docker-health <container> [maxRetries=100] [msBetweenRetries=2000]`

```sh
$ wait-for-docker-health my-container
Waiting for container = my-container state to be healthy
Docker container = my-container is healthy (took 0.166s)
```

### API

#### `waitForDockerHealth({ <container>, [maxRetries=100], [msBetweenRetries=2000] })`

```js
const waitForDockerHealth = require('@fintechstudios/wait-for-elasticsearch');

async main() {
  await waitForDockerHealth({ container: 'my-container' });
}
```

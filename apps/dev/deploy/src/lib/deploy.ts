import { getFirebaseDeployAuthParams } from '../+utils/getFirebaseDeployAuthParams';
import { exec } from '@seed/dev/utils';
import * as chalk from 'chalk';

export const deploy = (deployOnlyArray: string[]): void => {
  if (!deployOnlyArray.length) {
    console.log(chalk.yellow('Nothing to deploy'));

    return;
  }
  const only = deployOnlyArray.join(',');
  const auth = getFirebaseDeployAuthParams();
  const deployCommand = `yarn deploy --force ${auth} --only ${only}`;
  exec(deployCommand);
};

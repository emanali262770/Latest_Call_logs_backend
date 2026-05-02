import { existsSync } from 'fs';
import { spawnSync } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const args = process.argv.slice(2);
const userProfile = process.env.USERPROFILE || '';
const localAppData = process.env.LOCALAPPDATA || '';

const candidatePaths = [
  process.env.NGROK_PATH,
  path.join(localAppData, 'Microsoft', 'WinGet', 'Packages', 'Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe', 'ngrok.exe'),
  path.join(localAppData, 'Programs', 'ngrok', 'ngrok.exe'),
  path.join(userProfile, 'ngrok.exe')
].filter(Boolean);

function canRunFromPath() {
  const command = process.platform === 'win32' ? 'where.exe' : 'which';
  const result = spawnSync(command, ['ngrok'], { stdio: 'ignore' });
  return result.status === 0;
}

function resolveNgrokCommand() {
  if (canRunFromPath()) {
    return 'ngrok';
  }

  return candidatePaths.find((candidatePath) => existsSync(candidatePath));
}

const ngrokCommand = resolveNgrokCommand();

if (!ngrokCommand) {
  console.error('Unable to find ngrok. Install it, add it to PATH, or set NGROK_PATH in your environment.');
  process.exit(1);
}

const result = spawnSync(ngrokCommand, args, { stdio: 'inherit', shell: false });

if (result.error) {
  console.error(`Failed to start ngrok: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 0);
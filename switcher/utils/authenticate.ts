import inquirer from "inquirer";
import { Client } from "vex-tm-client";
import OBSWebSocket from "obs-websocket-js";
import { Atem } from "atem-connection";
import vextm from "../../secret/vextm.json";
import { log } from "./logging";

export type TMCredentials = {
  address: string;
  key: string;
}

export async function getTournamentManagerCredentials(): Promise<TMCredentials> {
  let { address, key } = await inquirer.prompt([
    {
      type: "input",
      message: "VEX TM Address:",
      name: "address",
      default() {
        return "127.0.0.1";
      },
    },
    {
      type: "input",
      message: "VEX TM API Key:",
      name: "key"
    }
  ]);

  const url = new URL(`http://${address}`);

  return { address: url.toString(), key };
}

export type OBSCredentials = {
  address: string;
  password: string;
}

export async function getOBSCredentials(): Promise<OBSCredentials | null> {

  const { useOBS }: { useOBS: boolean } = await inquirer.prompt([{
    type: "confirm",
    name: "useOBS",
    message: "Would you like to control OBS?",
    default: true
  }]);

  if (!useOBS) {
    return null;
  }

  return inquirer.prompt([
    {
      type: "input",
      message: "OBS Websocket Address:",
      name: "address",
      default() {
        return "ws://127.0.0.1:4455";
      },
    },
    {
      type: "password",
      message: "OBS Websocket (leave blank for no password):",
      mask: "*",
      name: "password",
    },
  ]);
}

export type ATEMCredentials = {
  address: string;
};

export async function getATEMCredentials(): Promise<ATEMCredentials | null> {

  const { useAtem }: { useAtem: boolean } = await inquirer.prompt([{
    type: "confirm",
    name: "useAtem",
    message: "Would you like to control an ATEM device over the network?",
    default: false
  }]);

  if (useAtem) {

    const { address }: { address: string } = await inquirer.prompt([{
      type: "input",
      message: "ATEM Address:",
      name: "address"
    }]);

    return { address };
  } else {
    return null;
  }

};

export type Credentials = {
  tm: TMCredentials;
  obs: OBSCredentials | null;
  atem: ATEMCredentials | null;
}

export async function getCredentials(): Promise<Credentials> {
  const tm = await getTournamentManagerCredentials();
  const obs = await getOBSCredentials();
  const atem = await getATEMCredentials();

  log(`info`, `TM Address: ${tm.address}`, false);
  log(`info`, `OBS Address: ${obs?.address}`, false);
  log(`info`, `ATEM Address: ${atem?.address}`, false);

  return { tm, obs, atem };
}

export async function keypress() {
  return new Promise((resolve, reject) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', resolve);
  });
};

export async function connectTM({
  address,
  key
}: TMCredentials) {
  const client = new Client(
    {
      address,
      authorization: {
        client_id: vextm.client_id,
        client_secret: vextm.client_secret,
        expiration_date: vextm.expiration_date,
        grant_type: "client_credentials"
      },
      clientAPIKey: key,
      bearerMargin: 30 * 60 // refresh the bearer with 30 minutes remaining
    }
  );

  const result = await client.connect();
  if (!result.success) {
    log("error", `Tournament Manager: ${result.error}`, `❌ Tournament Manager: ${result.error}`);

    log("error", `${JSON.stringify(result.error_details)}`, false);

    await keypress();
    process.exit(1);
  }

  return client;
}

export async function connectOBS(creds: OBSCredentials | null) {
  const obs = new OBSWebSocket();

  if (!creds) {
    return null;
  }

  try {
    await obs.connect(creds.address, creds.password);
    const version = await obs.call("GetVersion");

    log("info", `OBS Version: ${version.obsVersion}`, false);
    log("info", ` WebSocket: ${version.obsWebSocketVersion}`, false);
    log("info", ` Platform: ${version.platformDescription}`, false);
    log("info", ` RPC: ${version.rpcVersion}`, false);

    return obs;
  } catch (e: any) {
    log("error", `Open Broadcaster Studio: ${e}`, `❌ Open Broadcaster Studio: ${e}`);

    await keypress();
    process.exit(1);
  };
}

export async function connectATEM(creds: ATEMCredentials | null): Promise<Atem | null> {

  if (!creds?.address) {
    return null;
  };

  return new Promise((resolve) => {
    const atem = new Atem();

    // In order to suppress a message, add nothing listeners
    process.on("exit", () => { });
    process.on("uncaughtException", () => { });
    process.on("unhandledRejection", () => { });

    atem.connect(creds?.address);

    const timeout = setTimeout(async () => {
      log("error", `Could not connect to ATEM device`, `❌ ATEM: Could not connect to switcher`);
      atem.disconnect();

      await keypress();
      process.exit(1);
    }, 15000);

    atem.on("connected", () => {
      clearTimeout(timeout);
      atem.on("info", message => log("info", `ATEM: ${message}`));
      atem.on("error", message => log("error", `ATEM: ${message}`));

      for (const [name, input] of Object.entries(atem.state?.inputs ?? {})) {
        log("info", `ATEM Input Discovered: ${input?.shortName} (${name})`);
      }

      resolve(atem)
    });
  });
};
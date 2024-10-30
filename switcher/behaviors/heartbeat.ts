import { type Behavior } from "./index.js";
import process from "node:process";
import { log } from "../utils/logging.js";

export const HeartbeatBehavior: Behavior = ({
  attachments,
  connections,
  credentials,
}) => {
  const { tm, obs } = connections;
  const { fieldset } = attachments;

  let tmTimeout: NodeJS.Timeout | null = null;
  let obsTimeout: NodeJS.Timeout | null = null;

  async function tmHeartbeat(reconnect = false) {
    const divisions = await tm.getDivisions();
    if (divisions.success) {
      log("info", `Connected to TM`, reconnect ? undefined : false);
      clearTimeout(tmTimeout!);
      tmTimeout = setTimeout(tmHeartbeat, 1000 * 30);
      return;
    }

    log(
      "error",
      `TM Connection Lost: ${divisions.error}. Attempting to reconnect...`
    );
    clearTimeout(tmTimeout!);
    tmTimeout = setTimeout(() => tmHeartbeat(false), 1000 * 5);
  }

  async function obsHeartbeat(reconnect = false) {
    try {
      await obs?.call("GetVersion");

      log("info", `Connected to OBS`, reconnect ? undefined : false);

      clearTimeout(obsTimeout!);
      obsTimeout = setTimeout(obsHeartbeat, 1000 * 30);
    } catch (_) {
      log("error", `OBS Connection Lost. Attempting to reconnect...`);

      try {
        await obs?.connect(credentials.obs?.address, credentials.obs?.password);
      } catch (_) {
        clearTimeout(obsTimeout!);
        obsTimeout = setTimeout(obsHeartbeat, 1000 * 5);
      }
    }
  }

  tmTimeout = setTimeout(tmHeartbeat, 1000 * 30);
  fieldset.websocket?.on("close", () => fieldset.connect());

  if (obs) {
    setTimeout(obsHeartbeat, 1000 * 30);
  }

  process.on("unhandledRejection", () => {
    clearTimeout(obsTimeout!);
    clearTimeout(tmTimeout!);

    tmTimeout = setTimeout(tmHeartbeat, 0);
    obsTimeout = setTimeout(obsHeartbeat, 0);
  });
};

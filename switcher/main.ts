import {
  connectATEM,
  connectOBS,
  connectTM,
  getCredentials,
} from "./utils/authenticate.js";
import {
  getAssociations,
  getAudienceDisplayOptions,
  getDisplayAssociations,
  getRecordingOptions,
  getTournamentAttachments,
  initFileHandles,
} from "./utils/input.js";
import { log, setLogFile } from "./utils/logging.js";
import { promptForUpdate } from "./utils/update.js";

import { AudienceDisplayBehavior } from "./behaviors/display.js";
import { RecordingBehavior } from "./behaviors/recording.js";
import { CoreSwitcherBehavior } from "./behaviors/switcher.js";
import { LoggingBehavior } from "./behaviors/logging.js";
import { HeartbeatBehavior } from "./behaviors/heartbeat.js";
import { env } from "./utils/env.js";

const BEHAVIORS = {
  AudienceDisplayBehavior,
  RecordingBehavior,
  CoreSwitcherBehavior,
  LoggingBehavior,
  HeartbeatBehavior,
};

async function main() {
  console.log(
    `TM Switcher v${env.VERSION} - Created by Brendan McGuire (brendan@bren.app)`
  );

  await promptForUpdate();
  console.log("");

  // Logging
  const handles = await initFileHandles();
  setLogFile(handles.log);

  console.log(`Log File: ${handles.logPath}`);
  console.log(`Match Timestamps: ${handles.timestampPath}\n`);

  // Prompt the user for credentials
  const credentials = await getCredentials();

  console.log("");
  log("info", "Connecting to servers: ", "Connecting to servers: ");

  const tm = await connectTM(credentials.tm);
  log("info", "Connected to Tournament Manager", "✅ Tournament Manager");

  const obs = await connectOBS(credentials.obs);
  if (obs) {
    log("info", "Connected to OBS", `✅ OBS`);
  }

  const atem = await connectATEM(credentials.atem);
  if (atem) {
    log("info", "Connected to ATEM", "✅ ATEM");
  }

  console.log("");

  // Configuration
  const attachments = await getTournamentAttachments(tm);
  const associations = await getAssociations(attachments.fieldset, obs, atem);
  const displayAssociations = await getDisplayAssociations(obs, atem);

  console.log("");

  const audienceDisplayOptions = await getAudienceDisplayOptions();
  const recordingOptions = await getRecordingOptions(obs);

  console.log("");

  for (const [name, behavior] of Object.entries(BEHAVIORS)) {
    log("info", `Running behavior: ${name}`, false);
    await behavior({
      attachments,
      audienceDisplayOptions,
      associations,
      displayAssociations,
      recordingOptions,
      connections: { tm, obs, atem },
      handles,
      credentials: credentials,
    });
  }
}

main();

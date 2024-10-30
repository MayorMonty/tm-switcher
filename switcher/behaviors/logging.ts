import { type Behavior } from "./index.js";
import { log } from "../utils/logging.js";
import {
  getMatchName,
  getUnderlyingMatch,
  matchesEqual,
} from "../utils/match.js";
import { Match } from "vex-tm-client";

export const LoggingBehavior: Behavior = ({
  associations,
  attachments,
  connections,
  recordingOptions,
  handles,
}) => {
  const { obs } = connections;
  const { division, fieldset } = attachments;
  const { timestamp } = handles;

  async function getCurrentTimecode() {
    const recordStatus = await obs?.call("GetRecordStatus");
    const streamStatus = await obs?.call("GetStreamStatus");

    // Get the current "stream time" in seconds
    let timecode = "00:00:00";

    if (
      recordStatus &&
      recordStatus.outputActive &&
      !recordingOptions.recordIndividualMatches
    ) {
      timecode = recordStatus.outputTimecode;
    } else if (streamStatus && streamStatus.outputActive) {
      timecode = streamStatus.outputTimecode;
    }

    return timecode;
  }

  fieldset.on("matchStarted", async (event) => {
    const timecode = await getCurrentTimecode();
    const { fieldID } = event;
    const association = associations[fieldID];

    const matchName = fieldset.state.match
      ? getMatchName(fieldset.state.match)
      : "Match";
    log(
      "info",
      `[${timecode}] ${matchName} started on field ${fieldID} [OBS: ${
        association?.obs ?? "none"
      }, ATEM: ${association?.atem ?? "none"}]`
    );

    let match: Match | undefined = undefined;

    const matches = await division.getMatches();
    if (!matches.success) {
      log(
        "error",
        `Could not fetch matches from Tournament Manager: ${matches.error}`
      );
    } else {
      match = matches.data.find((m) =>
        matchesEqual(
          m.matchInfo.matchTuple,
          getUnderlyingMatch(fieldset.state.match)
        )
      );
    }

    const recordStatus = await obs?.call("GetRecordStatus");
    const streamStatus = await obs?.call("GetStreamStatus");

    const stat = await timestamp.stat();

    if (stat.size < 1) {
      timestamp.write(
        "Timestamp,Recording Time,Stream Time,Scheduled Time,Match,Team 1,Team 2,Team 3,Team 4\n"
      );
    }

    const teams =
      match?.matchInfo.alliances
        .map((alliance) => alliance.teams.map((team) => team.number))
        .flat() ?? [];
    const scheduled = match
      ? new Date(match.matchInfo.timeScheduled * 1000).toISOString()
      : "";

    timestamp.write(
      [
        new Date().toISOString(),
        recordStatus?.outputTimecode ?? "00:00:00",
        streamStatus?.outputTimecode ?? "00:00:00",
        scheduled,
        matchName,
        ...teams,
      ].join(",") + "\n"
    );
  });

  fieldset.on("matchStopped", async (event) => {
    const timecode = await getCurrentTimecode();
    const { fieldID } = event;
    const matchName = fieldset.state.match
      ? getMatchName(fieldset.state.match)
      : "Match";

    log("info", `[${timecode}] ${matchName} ended on field ${fieldID} `);
  });

  fieldset.on("fieldActivated", async (event) => {
    const timecode = await getCurrentTimecode();
    const { fieldID } = event;
    const association = associations[fieldID];

    const matchName = fieldset.state.match
      ? getMatchName(fieldset.state.match)
      : "Match";

    log(
      "info",
      `[${timecode}] ${matchName} activated on field ${fieldID} [OBS: ${
        association?.obs ?? "none"
      }, ATEM: ${association?.atem ?? "none"}]`
    );
  });

  fieldset.on("fieldMatchAssigned", async (event) => {
    const timecode = await getCurrentTimecode();
    const { fieldID } = event;
    const association = associations[fieldID];

    const matchName = getMatchName(fieldset.state.match);
    log(
      "info",
      `[${timecode}] ${matchName} assigned to field ${fieldID} [OBS: ${
        association?.obs ?? "none"
      }, ATEM: ${association?.atem ?? "none"}]`
    );
  });

  fieldset.on("audienceDisplayChanged", async (event) => {
    const timecode = await getCurrentTimecode();

    log("info", `[${timecode}] Audience display changed to ${event.display}`);
  });

  fieldset.websocket?.addEventListener("message", (event) => {
    log("info", `TM: ${event.data}`, false);
  });

  fieldset.websocket?.addEventListener("close", (event) => {
    log("error", `TM: ${event.reason}`, false);
  });
};

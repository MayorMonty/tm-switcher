import {
  FieldsetActiveMatchType,
  FieldsetAudienceDisplay,
  MatchRound,
} from "vex-tm-client";
import type { Behavior } from "./index.js";
import { log } from "../utils/logging.js";

export const AudienceDisplayBehavior: Behavior = ({
  attachments,
  audienceDisplayOptions,
}) => {
  const { fieldset } = attachments;

  fieldset.on("fieldActivated", async () => {
    if (audienceDisplayOptions.queueIntro) {
      log("info", "Field activated, showing intro");

      switch (fieldset.state.audienceDisplay) {
        case FieldsetAudienceDisplay.Rankings:
        case FieldsetAudienceDisplay.SavedMatchResults: {
          // Delay to account for switching program input when the new match is queued
          setTimeout(
            () => fieldset.setAudienceDisplay(FieldsetAudienceDisplay.Intro),
            6000
          );
          break;
        }

        default: {
          await fieldset.setAudienceDisplay(FieldsetAudienceDisplay.Intro);
          break;
        }
      }
    }
  });

  fieldset.on("matchStopped", () => {
    const match = fieldset.state.match;
    if (match.type !== FieldsetActiveMatchType.Match) {
      return;
    }

    if (audienceDisplayOptions.flashRankings) {
      let display: FieldsetAudienceDisplay | null = null;

      if (
        match.match.round === MatchRound.Practice &&
        match.match.match % 6 === 0
      ) {
        display = FieldsetAudienceDisplay.Schedule;
      }

      if (
        match.match.round === MatchRound.Qualification &&
        match.match.match % 6 === 0
      ) {
        display = FieldsetAudienceDisplay.Rankings;
      }

      if (display) {
        log("info", "Match ended, showing " + display);
        setTimeout(() => fieldset.setAudienceDisplay(display!), 2000);
      }
    } else if (audienceDisplayOptions.savedScore) {
      log("info", "Match ended, showing saved match results");
      setTimeout(
        () =>
          fieldset.setAudienceDisplay(
            FieldsetAudienceDisplay.SavedMatchResults
          ),
        2000
      );
    }
  });
};

import { type Behavior } from "./index.js";
import { FieldsetAudienceDisplay } from "vex-tm-client";

export const CoreSwitcherBehavior: Behavior = ({
  associations,
  attachments,
  connections,
  audienceDisplayOptions,
  displayAssociations,
}) => {
  const { fieldset } = attachments;
  const { obs, atem } = connections;

  async function switchTo(fieldID: number) {
    const association = associations[fieldID];

    if (obs && association?.obs) {
      await obs.call("SetCurrentProgramScene", { sceneName: association.obs });
    }

    if (atem && association?.atem) {
      await atem.changeProgramInput(association.atem);
    }
  }

  fieldset.on("matchStarted", async (match) => {
    const { fieldID } = match;
    await switchTo(fieldID);
  });

  fieldset.on("fieldActivated", async (match) => {
    const { fieldID } = match;

    const delaySwitch =
      (audienceDisplayOptions.savedScore ||
        audienceDisplayOptions.flashRankings) &&
      fieldset.state.audienceDisplay !== FieldsetAudienceDisplay.Intro;

    // Delay switching modes here to not immediately switch away from saved score or rankings,
    // if applicable
    if (delaySwitch) {
      setTimeout(() => switchTo(fieldID), 5000);
    } else {
      await switchTo(fieldID);
    }
  });

  // Update OBS and ATEM Scene based on Audience Display Mode
  fieldset.on("audienceDisplayChanged", async ({ display }) => {
    const association = displayAssociations[display];

    if (!association) {
      return;
    }

    if (obs && association?.obs) {
      await obs.call("SetCurrentProgramScene", { sceneName: association.obs });
    }

    if (atem && association?.atem) {
      await atem.changeProgramInput(association.atem);
    }
  });
};

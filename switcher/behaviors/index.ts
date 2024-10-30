import { Atem } from "atem-connection";
import OBSWebSocket from "obs-websocket-js";
import { Credentials } from "../utils/authenticate.js";
import {
  AudienceDisplayOptions,
  DisplayAssociations,
  FieldAssociations,
  FileHandles,
  RecordingOptions,
  TournamentAttachments,
} from "../utils/input.js";
import { Client } from "vex-tm-client";

export type SwitcherBehavior = {
  attachments: TournamentAttachments;
  audienceDisplayOptions: AudienceDisplayOptions;
  associations: FieldAssociations;
  displayAssociations: DisplayAssociations;
  recordingOptions: RecordingOptions;
  handles: FileHandles;
  connections: {
    tm: Client;
    obs: OBSWebSocket | null;
    atem: Atem | null;
  };
  credentials: Credentials;
};

export type Behavior = (behavior: SwitcherBehavior) => Promise<void> | void;

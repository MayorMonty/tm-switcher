import { promises as fs } from "node:fs";
import { join } from "node:path";
import process, { cwd } from "node:process";
import { networkInterfaces, tmpdir } from "node:os";
import inquirer, { DistinctQuestion } from "inquirer";
import ObsWebSocket from "obs-websocket-js";
import OBSWebSocket from "obs-websocket-js";
import { Atem } from "atem-connection";
import {
  Client,
  Division,
  Fieldset,
  FieldsetAudienceDisplay,
} from "vex-tm-client";
import { keypress } from "./authenticate.js";
import { log } from "./logging.js";
import { promptReportIssue } from "./report.js";
import { env } from "./env.js";

export type TournamentAttachments = {
  fieldset: Fieldset;
  division: Division;
};

export async function getTournamentAttachments(
  tm: Client
): Promise<TournamentAttachments> {
  const fieldsets = await tm.getFieldsets();
  if (!fieldsets.success) {
    log(
      "error",
      `❌ Tournament Manager: Could not fetch fieldsets ${fieldsets.error}`
    );
    log("error", `${fieldsets.error_details}`);

    await promptReportIssue(
      `Tournament Manager: Could not fetch fieldsets: ${JSON.stringify(
        fieldsets
      )}`
    );
    process.exit(1);
  }

  let fieldset = fieldsets.data[0];

  if (fieldsets.data.length > 1) {
    const response: { fieldset: number } = await inquirer.prompt([
      {
        name: "fieldset",
        type: "list",
        message: "Attach to which fieldset? ",
        choices: fieldsets.data.map((d) => ({ name: d.name, value: d.id })),
      },
    ]);

    fieldset = fieldsets.data.find(
      (d) => d.id === response.fieldset
    ) as Fieldset;
  }

  const result = await fieldset.connect();
  if (!result.success) {
    log(
      "error",
      `❌ Tournament Manager: Could not connect to Fieldset ${result.error}`
    );
    log("error", `${result.error_details}`);

    await promptReportIssue(
      `Tournament Manager: Could not connect to Fieldset: ${JSON.stringify(
        result
      )}`
    );
    process.exit(1);
  }

  const divisions = await tm.getDivisions();
  if (!divisions.success) {
    log(
      "error",
      `❌ Tournament Manager: Could not fetch divisions ${divisions.error}`
    );
    log("error", `${divisions.error_details}`);
    await promptReportIssue(
      `Tournament Manager: Could not fetch divisions: ${JSON.stringify(
        divisions
      )}`
    );
    process.exit(1);
  }

  let division = divisions.data[0];

  if (divisions.data.length > 1) {
    const response: { division: number } = await inquirer.prompt([
      {
        name: "division",
        type: "list",
        message: "Attach to which division? ",
        choices: divisions.data.map((d) => ({ name: d.name, value: d.id })),
        default: division.id,
      },
    ]);

    division = divisions.data.find(
      (d) => d.id === response.division
    ) as Division;
  }

  return {
    fieldset,
    division,
  };
}

export type Association = {
  obs: string | undefined;
  atem: number | undefined;
};

export type FieldAssociations = Record<string, Association | undefined>;

export async function getAssociations(
  fieldset: Fieldset,
  obs: ObsWebSocket | null,
  atem: Atem | null
): Promise<FieldAssociations> {
  const fields = await fieldset.getFields();
  if (!fields.success) {
    log(
      "error",
      `❌ Tournament Manager: Could not fetch fields in fieldset ${fields.error}`
    );
    log("error", `${fields.error_details}`);

    await keypress();
    process.exit(1);
  }

  const scenes = (await obs?.call("GetSceneList")) ?? { scenes: [] };
  const associations: FieldAssociations = {};

  for (const field of fields.data) {
    const questions: DistinctQuestion[] = [];

    if (obs && scenes.scenes.length > 0) {
      const defaultValue = scenes.scenes.find(
        (s) => `${s.sceneName}`.toLowerCase() === field.name.toLowerCase()
      )?.sceneName as string | undefined;
      questions.push({
        name: "obs",
        type: "list",
        message: `What OBS scene do you want to associate with ${field.name}? `,
        choices: scenes.scenes.map((s) => s.sceneName as string),
        default: defaultValue,
      });
    }

    if (atem && atem.state) {
      const inputs = Object.entries(atem.state?.inputs);
      const defaultValue = Number.parseInt(
        inputs.find(
          ([_, input]) =>
            input?.shortName.toLowerCase() === field.name.toLowerCase()
        )?.[0] ?? "NaN"
      );
      questions.push({
        name: "atem",
        type: "list",
        message: `What ATEM input do you want to associate with ${field.name}? `,
        choices: inputs.map(([value, input]) => ({
          name: input?.shortName,
          value: Number.parseInt(value),
        })),
        default: isNaN(defaultValue) ? undefined : defaultValue,
      });
    }

    const response = await inquirer.prompt<Association>(questions);
    associations[field.id] = response;
  }

  return associations;
}

export type DisplayAssociations = Record<
  FieldsetAudienceDisplay,
  Association | undefined
>;

const MODES = [
  FieldsetAudienceDisplay.Blank,
  FieldsetAudienceDisplay.Logo,
  FieldsetAudienceDisplay.SavedMatchResults,
  FieldsetAudienceDisplay.Schedule,
  FieldsetAudienceDisplay.Rankings,
  FieldsetAudienceDisplay.SkillsRankings,
  FieldsetAudienceDisplay.AllianceSelection,
  FieldsetAudienceDisplay.ElimBracket,
  FieldsetAudienceDisplay.Slides,
  FieldsetAudienceDisplay.Inspection,
];

export async function getDisplayAssociations(
  obs: ObsWebSocket | null,
  atem: Atem | null
): Promise<DisplayAssociations> {
  const associations: DisplayAssociations = {
    [FieldsetAudienceDisplay.Blank]: undefined,
    [FieldsetAudienceDisplay.Logo]: undefined,
    [FieldsetAudienceDisplay.Intro]: undefined,
    [FieldsetAudienceDisplay.InMatch]: undefined,
    [FieldsetAudienceDisplay.SavedMatchResults]: undefined,
    [FieldsetAudienceDisplay.Schedule]: undefined,
    [FieldsetAudienceDisplay.Rankings]: undefined,
    [FieldsetAudienceDisplay.SkillsRankings]: undefined,
    [FieldsetAudienceDisplay.AllianceSelection]: undefined,
    [FieldsetAudienceDisplay.ElimBracket]: undefined,
    [FieldsetAudienceDisplay.Slides]: undefined,
    [FieldsetAudienceDisplay.Inspection]: undefined,
  };

  const obsScenes = (await obs?.call("GetSceneList")) ?? { scenes: [] };
  const atemInputs = Object.entries(atem?.state?.inputs ?? {});

  if (obsScenes.scenes.length < 2 && atemInputs.length < 2) {
    return associations;
  }

  const { associated_scene } = await inquirer.prompt({
    name: "associated_scene",
    type: "confirm",
    message: "Associate Display Modes? ",
    default: false,
  });

  if (!associated_scene) {
    return associations;
  }

  for (const mode of MODES) {
    const { associate } = await inquirer.prompt({
      name: "associate",
      type: "confirm",
      message: `Switch on ${mode}? `,
      default: false,
    });

    if (!associate) {
      continue;
    }

    const questions: DistinctQuestion[] = [];
    if (obsScenes.scenes.length > 1) {
      const defaultValue = obsScenes.scenes.find((v) =>
        (v.sceneName as string).toLowerCase().includes(mode.toLowerCase())
      );
      questions.push({
        type: "list",
        name: "obs",
        message: `${mode} OBS Scene? `,
        default: defaultValue,
        choices: [
          ...obsScenes.scenes.map((s) => s.sceneName as string),
          { name: "No Association", value: undefined },
        ],
      });
    }

    if (atemInputs.length > 1) {
      questions.push({
        type: "list",
        name: "atem",
        message: `${mode} ATEM Input? `,
        choices: [
          ...atemInputs.map(([value, input]) => ({
            name: input?.shortName,
            value: Number.parseInt(value),
          })),
          { name: "No Association", value: undefined },
        ],
      });
    }

    associations[mode] = (await inquirer.prompt(questions)) as Association;
  }

  return associations;
}

export type RecordingOptions = {
  recordIndividualMatches: boolean;
};

export async function getRecordingOptions(
  obs: OBSWebSocket | null
): Promise<RecordingOptions> {
  let response = { recordIndividualMatches: false };
  if (obs) {
    response = await inquirer.prompt([
      {
        name: "recordIndividualMatches",
        type: "confirm",
        message: "Start and stop recording for each match? ",
        default: false,
      },
    ]);
  }

  return response;
}

export type AudienceDisplayOptions = {
  queueIntro: boolean;
  savedScore: boolean;
  flashRankings: boolean;
};

export async function getAudienceDisplayOptions(): Promise<AudienceDisplayOptions> {
  const choices = [
    { name: "Show intro upon field activation", value: "queueIntro" },
    { name: "Show saved score after match", value: "savedScore" },
    { name: "Show rankings after every 6th match", value: "flashRankings" },
  ] as const;

  const response: { options: (keyof AudienceDisplayOptions)[] } =
    await inquirer.prompt([
      {
        name: "options",
        type: "checkbox",
        message: "Which audience display automation would you like to enable?",
        choices,
      },
    ]);

  const flags = Object.fromEntries(
    choices.map((ch) => [ch.value, false])
  ) as AudienceDisplayOptions;
  for (const option of response.options) {
    flags[option] = true;
  }

  return flags;
}

export type FileHandles = {
  timestamp: fs.FileHandle;
  log: fs.FileHandle;

  logPath: string;
  timestampPath: string;
};

export function getFileHandles(): Pick<
  FileHandles,
  "logPath" | "timestampPath"
> {
  const directory = cwd();

  const date = new Date().toISOString().split("T")[0];
  const timestampPath = join(directory, `tm_switcher_${date}_times.csv`);

  const logPath = join(tmpdir(), `tm_switcher_${date}_log.txt`);

  return { logPath, timestampPath };
}

export async function initFileHandles(): Promise<FileHandles> {
  const { logPath, timestampPath } = await getFileHandles();
  const timestamp = await fs.open(timestampPath, "a");
  const log = await fs.open(logPath, "a");

  await log.write(
    `\n\ntm-switcher v${env.VERSION} started at ${new Date().toISOString()}\n`
  );
  await log.write(`OS:  ${process.platform} ${process.arch}\n`);
  await log.write(`Node Version:  ${process.version}\n`);
  await log.write(`Directory:  ${cwd()}\n`);

  await log.write(`Network Interfaces: \n`);
  const interfaces = networkInterfaces();
  for (const [name, iface] of Object.entries(interfaces)) {
    await log.write(`  ${name}: ${iface?.map((i) => i.address).join(", ")}\n`);
  }

  return { timestamp, log, logPath, timestampPath };
}

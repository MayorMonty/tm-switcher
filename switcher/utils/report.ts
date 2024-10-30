import { readFile } from "node:fs/promises";
import * as os from "node:os";
import inquirer from "inquirer";
import { getFileHandles } from "./input.js";
import { keypress } from "./authenticate.js";
import { env } from "./env.js";
import process from "node:process";

const DUMP_ENDPOINT = new URL("/dump", env.LOG_SERVER);

export type IssueReportMetadata = {
  email: string;
  comment: string;
};

export type IssueReportResponse = {
  correlation: string;
};

export async function reportIssue(
  context: string
): Promise<IssueReportResponse> {
  console.log(
    "\n\nPlease give a brief description of what went wrong. If you provide an email, we may reach out to clarify or to notify you of resolution. Information about your device and your session will be included with your report.\n"
  );

  const { email, comment } = await inquirer.prompt([
    {
      name: "email",
      type: "input",
      message: "Email?",
    },
    {
      name: "comment",
      type: "input",
      message: "Comment?",
    },
  ]);

  const frontmatter = [
    [`Email`, email],
    [`Comment`, comment],
    [`Version`, env.VERSION],
    [`Date`, new Date().toISOString()],
    [
      `System`,
      `Platform=${os.platform()} Machine=${os.machine()} Version=${os.version()} Release=${os.release()}`,
    ],
  ];

  const { logPath } = await getFileHandles();
  const logs = await readFile(logPath);

  const body = [
    frontmatter.map((e) => `${e[0]}: ${e[1]}`).join("\n"),
    context,
    logs,
  ].join("\n\n--\n\n");

  const response = await fetch(DUMP_ENDPOINT, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${env.LOG_SERVER_TOKEN}`,
      "X-Log-Server-Frontmatter": JSON.stringify(
        Object.fromEntries(frontmatter)
      ),
    },
    body,
  });

  const data = await response.json();
  return data as IssueReportResponse;
}

export async function promptReportIssue(context: string) {
  const { shouldReport } = await inquirer.prompt({
    name: "shouldReport",
    type: "confirm",
    message: "Report Issue?",
  });

  if (!shouldReport) {
    return;
  }

  const { correlation } = await reportIssue(context);
  console.log(
    `\n\nYour report has been successfully submitted. Please reference this Correlation ID when communicating with the developers about this issue.`
  );
  console.log(`Correlation ID: ${correlation}`);

  await keypress();
}

process.on("uncaughtException", async (error) => {
  console.log(error);
  await promptReportIssue(error.toString());
  process.exit(1);
});

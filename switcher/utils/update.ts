import chalk from "chalk";
import { env } from "./env.js";
import type { Endpoints } from "@octokit/types/dist-types/generated/Endpoints.js";

export type ListReleasesResponse =
  Endpoints["GET /repos/{owner}/{repo}/releases"]["response"]["data"];
export type Release = ListReleasesResponse[0];

const RELEASES_URL =
  "https://api.github.com/repos/brenapp/tm-switcher/releases";

export async function getReleases(): Promise<ListReleasesResponse | null> {
  try {
    const headers = new Headers();
    headers.set("Accept", "application/vnd.github+json");
    headers.set("X-GitHub-Api-Version", "2022-11-28");

    const response = await fetch(RELEASES_URL, {
      headers,
    });

    if (!response.ok) {
      return null;
    }

    const body = await response.json();

    return body as ListReleasesResponse;
  } catch (_) {
    return null;
  }
}

export async function getLatestRelease(): Promise<Release | null> {
  const releases = await getReleases();

  if (!releases) {
    return null;
  }

  return (
    releases.find((release) => !release.prerelease && !release.draft) ?? null
  );
}

export type Version = [major: number, minor: number, patch: number];

export function parseVersion(version: string): Version {
  if (version.startsWith("v")) {
    version = version.slice(1);
  }

  return version.split(".").map((num) => Number.parseInt(num) ?? 0) as Version;
}

export function compareVersion(current: Version, newest: Version) {
  const major = newest[0] - current[0];
  if (major !== 0) {
    return Math.sign(major);
  }

  const minor = newest[1] - current[1];
  if (minor !== 0) {
    return Math.sign(minor);
  }

  const patch = newest[2] - current[2];
  return Math.sign(patch);
}

export async function promptForUpdate() {
  const version: string = env.VERSION;

  const release = await getLatestRelease();
  if (!release) {
    return null;
  }

  const current = parseVersion(version);
  const newest = parseVersion(release.tag_name);

  if (compareVersion(current, newest) > 0) {
    console.log(
      ` ↳ ${chalk.green("Update Available!")} Download ${chalk.magenta(
        release.tag_name
      )} from ${chalk.underline(chalk.blueBright(release.html_url))}`
    );
  }
}

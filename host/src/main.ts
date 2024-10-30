import { Channel, invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { FitAddon } from "@xterm/addon-fit";
import { ITheme, Terminal } from "@xterm/xterm";
import colors from "tailwindcss/colors";

import "@xterm/xterm/css/xterm.css";

export const theme: ITheme = {
  background: colors.zinc["900"],
  foreground: colors.zinc["50"],
  black: colors.zinc["900"],
  brightBlack: colors.zinc["950"],
  white: colors.zinc["50"],
  brightBlue: colors.blue["300"],
  brightCyan: colors.cyan["300"],
  brightGreen: colors.emerald["300"],
  brightMagenta: colors.fuchsia["300"],
  brightRed: colors.red["300"],
  brightWhite: colors.zinc["50"],
  brightYellow: colors.yellow["300"],
  blue: colors.blue["400"],
  cyan: colors.cyan["400"],
  green: colors.green["400"],
  magenta: colors.fuchsia["400"],
  red: colors.red["400"],
  yellow: colors.yellow["400"],
};

type ProcessEvent =
  | {
      event: "output";
      data: number[];
    }
  | {
      event: "terminated";
    };

async function createTTY() {
  const terminal = new Terminal({
    theme,
    cursorBlink: true,
    allowProposedApi: true,
    allowTransparency: true,
  });

  const element = document.getElementById("terminal");
  if (!element) {
    return;
  }
  terminal.open(element);

  // Fit the terminal to the container
  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);
  fitAddon.fit();

  const observer = new ResizeObserver((entries) => {
    const entry = entries[0];

    fitAddon.fit();
    emit("resize", {
      cols: terminal.cols,
      rows: terminal.rows,
      pixel_height: entry.contentRect.height,
      pixel_width: entry.contentRect.width,
    });
  });
  observer.observe(element);

  // Begin the hosted process
  const process = new Channel<ProcessEvent>();
  const size = {
    cols: terminal.cols,
    rows: terminal.rows,
    pixel_height: element.clientHeight,
    pixel_width: element.clientWidth,
  };

  await invoke("begin", { process, size });

  process.onmessage = (message) => {
    if (message.event === "output") {
      terminal.write(new Uint8Array(message.data));
    } else if (message.event === "terminated") {
      terminal.dispose();
    }
  };

  terminal.onData((data) => {
    emit("data", data);
  });
}

export function loadTheme(theme: ITheme) {
  for (const [key, value] of Object.entries(theme)) {
    document.body.style.setProperty(`--${key}`, value);
  }
}

loadTheme(theme);

window.addEventListener("DOMContentLoaded", createTTY);

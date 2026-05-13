import { fileURLToPath } from "node:url";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const SETUP_MESSAGE_TYPE = "mypi-setup";
const MAX_OUTPUT_CHARS = 12_000;

function setupEntrypoint(): string {
	return fileURLToPath(new URL("../bin/mypi.mjs", import.meta.url));
}

function splitArgs(input: string): string[] {
	const args: string[] = [];
	let current = "";
	let quote: "'" | '"' | null = null;
	let escaping = false;

	for (const char of input.trim()) {
		if (escaping) {
			current += char;
			escaping = false;
			continue;
		}
		if (char === "\\") {
			escaping = true;
			continue;
		}
		if (quote) {
			if (char === quote) quote = null;
			else current += char;
			continue;
		}
		if (char === "'" || char === '"') {
			quote = char;
			continue;
		}
		if (/\s/.test(char)) {
			if (current) {
				args.push(current);
				current = "";
			}
			continue;
		}
		current += char;
	}
	if (escaping) current += "\\";
	if (current) args.push(current);
	return args;
}

function outputBlock(stdout: string, stderr: string): string {
	const output = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n\n");
	if (!output) return "";
	const clipped = output.length > MAX_OUTPUT_CHARS ? `${output.slice(-MAX_OUTPUT_CHARS)}\n…output clipped…` : output;
	return `\n\n\`\`\`\n${clipped}\n\`\`\``;
}

export default function mypiSetupExtension(pi: ExtensionAPI) {
	pi.registerCommand("mypi-setup", {
		description: "Install/reconcile the mypi Pi package catalog",
		getArgumentCompletions: (prefix: string) => {
			const options = [
				{ value: "--local", label: "--local", description: "install into this project's .pi/settings.json" },
				{ value: "--only core", label: "--only core", description: "install only a category or package id" },
				{ value: "--except ui", label: "--except ui", description: "skip a category or package id" },
				{ value: "--dry-run", label: "--dry-run", description: "show actions without changing anything" },
			];
			const trimmed = prefix.trimStart();
			const filtered = options.filter((item) => item.value.startsWith(trimmed)).slice(0, 8);
			return filtered.length > 0 ? filtered : null;
		},
		handler: async (args, ctx) => {
			if (ctx.hasUI) ctx.ui.notify("Running mypi setup…", "info");
			const result = await pi.exec("node", [setupEntrypoint(), "install", "--yes", ...splitArgs(args)]);
			const code = result.code ?? 1;
			const title = code === 0 ? "mypi setup complete" : `mypi setup failed (exit ${code})`;
			if (ctx.hasUI) ctx.ui.notify(title, code === 0 ? "info" : "error");
			pi.sendMessage(
				{
					customType: SETUP_MESSAGE_TYPE,
					content: `${title}${outputBlock(result.stdout ?? "", result.stderr ?? "")}`,
					display: true,
				},
				{ triggerTurn: false },
			);
		},
	});
}

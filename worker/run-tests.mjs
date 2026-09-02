import { spawn } from "node:child_process";

const ANSI = new RegExp(String.fromCharCode(27) + "\\[[0-9;]*m", "g");
const TEARDOWN_UNLINK =
  /Unhandled Rejection[\s\S]*?(EBUSY|EPERM)[\s\S]*?unlink/;
const A_FILE_PASSED = /\n\s*✓ \|/;
const A_TEST_FAILED = /\n\s*[❯×]\s|Failed Tests/;

const vitest = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vitest", "run", "--passWithNoTests", ...process.argv.slice(2)],
  { shell: process.platform === "win32" },
);

let transcript = "";

function relay(stream, to) {
  stream.on("data", (chunk) => {
    transcript += chunk.toString();
    to.write(chunk);
  });
}

relay(vitest.stdout, process.stdout);
relay(vitest.stderr, process.stderr);

vitest.on("close", (code) => {
  if (code === 0) {
    process.exit(0);
  }
  const plain = transcript.replace(ANSI, "");
  const onlyTeardownFailed =
    TEARDOWN_UNLINK.test(plain) &&
    A_FILE_PASSED.test(plain) &&
    !A_TEST_FAILED.test(plain);
  if (onlyTeardownFailed) {
    process.stdout.write(
      "\nEvery test passed. The failure above is the workers pool failing to " +
        "delete its own temporary directory on Windows, after the run.\n",
    );
    process.exit(0);
  }
  process.exit(code ?? 1);
});

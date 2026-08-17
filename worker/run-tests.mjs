import { spawn } from "node:child_process";

// Vitest's workers pool deletes its own temporary directory when the run ends.
// On Windows the runtime has not let go of the rooms' SQLite files by then, so
// the unlink throws EBUSY into the parent process as an unhandled rejection and
// a suite where every single test passed exits 1.
//
// Nothing in the pool's configuration moves that directory --
// durableObjectsPersist and defaultPersistRoot are both ignored -- and
// dangerouslyIgnoreUnhandledErrors silences the report without changing the
// exit code. So the failure is recognised here instead, as narrowly as it can
// be: only an unlink that could not get at a file, and only when vitest also
// reported no failing test. Anything else exits as vitest left it.
const ANSI = new RegExp(String.fromCharCode(27) + "\\[[0-9;]*m", "g");
const TEARDOWN_UNLINK =
  /Unhandled Rejection[\s\S]*?(EBUSY|EPERM)[\s\S]*?unlink/;
// The unhandled rejection aborts the run before vitest prints its summary, so
// there is no "N passed" line to read. What there is, is one line per test
// file: a tick for a file that passed and an arrow for one that did not.
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

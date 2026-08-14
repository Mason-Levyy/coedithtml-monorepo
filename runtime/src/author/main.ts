import { startAuthoring } from "./session";

const runtime = window.__coedit__;
if (runtime !== undefined) {
  runtime.author = startAuthoring;
}

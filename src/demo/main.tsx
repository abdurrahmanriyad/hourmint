// Dev-only demo: the real UI against an in-memory fake backend, for screenshots
// and design checks in a normal browser. Open /demo.html?window=main|popover|idle
// (add &theme=dark, &onboarded=0, #/route). Not part of the production build.
import { installDemoBackend } from "./backend";

const params = new URLSearchParams(location.search);
if (params.get("clean") === "1") localStorage.setItem("hourmint.hint.menubar.dismissed", "1");
installDemoBackend(params.get("window") ?? "main", params.get("theme"), params.get("onboarded") !== "0");
// &frame=340x500 renders inside a fixed-size box (headless Chrome can't make tiny windows).
const frame = params.get("frame")?.match(/^(\d+)x(\d+)$/);
if (frame) {
  document.documentElement.style.background = "#d4d4d8";
  const root = document.getElementById("root")!;
  Object.assign(root.style, { width: `${frame[1]}px`, height: `${frame[2]}px`, overflow: "hidden", margin: "24px", borderRadius: "12px", boxShadow: "0 12px 32px rgba(0,0,0,.25)", position: "relative", transform: "translateZ(0)" });
}
await import("../main");
// &scroll=bottom scrolls the page content to the end once it has rendered.
if (params.get("scroll") === "bottom") setTimeout(() => document.querySelector("main")?.scrollTo(0, 1e6), 1500);

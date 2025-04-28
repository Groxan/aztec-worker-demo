export default defineBackground(() => {
  runOffscreen();
});

async function runOffscreen() {
  await browser.offscreen.createDocument({
    url: "/offscreen.html",
    reasons: [browser.offscreen.Reason.WORKERS],
    justification: "bla-bla",
  });
}
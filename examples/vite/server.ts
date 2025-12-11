export default {
  fetch(req: Request) {
    // eslint-disable-next-line no-console
    console.log(`[${req.method}] ${req.url}`)
  },
}

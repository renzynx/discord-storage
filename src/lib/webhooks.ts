export class WebhookQueue {
  url: string;
  queue: (() => Promise<string>)[] = [];
  running = false;
  rateLimitRemaining = 5;
  rateLimitResetAfter = 0;
  lastReset = 0;

  constructor(url: string) {
    this.url = url;
  }

  async send(task: () => Promise<string>): Promise<string> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          // Wait for rate limit if needed
          if (this.rateLimitRemaining <= 0) {
            const now = Date.now();
            const wait = Math.max(this.rateLimitResetAfter - now, 0);
            if (wait > 0) await new Promise((r) => setTimeout(r, wait));
          }
          const result = await task();
          resolve(result);
          return result;
        } catch (e) {
          reject(e);
          throw e;
        }
      });
      this.run();
    });
  }

  async run() {
    if (this.running) return;
    this.running = true;
    while (this.queue.length > 0) {
      const fn = this.queue.shift();
      if (!fn) break;
      try {
        await (fn as () => Promise<string>)();
      } catch {
        // ...
      }
    }
    this.running = false;
  }

  updateRateLimit(headers: Headers | XMLHttpRequest) {
    // Accepts either fetch Headers or XMLHttpRequest
    let get = (k: string) =>
      "getResponseHeader" in headers
        ? headers.getResponseHeader(k)
        : headers.get(k);
    const remaining = parseInt(get("X-RateLimit-Remaining") || "5", 10);
    const resetAfter = parseFloat(get("X-RateLimit-Reset-After") || "0");
    this.rateLimitRemaining = isNaN(remaining) ? 5 : remaining;
    if (!isNaN(resetAfter)) {
      this.rateLimitResetAfter = Date.now() + resetAfter * 1000;
    }
  }
}

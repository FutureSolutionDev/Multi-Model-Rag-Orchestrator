export default class CircuitBreaker {
  private failures = 0;
  private lastFailureAt = 0;
  private openUntil = 0;
  constructor(private maxFailures = 3, private coolDownMs = 30_000) {}
  canPass() { return Date.now() > this.openUntil; }
  recordSuccess() { this.failures = 0; }
  recordFailure() {
    this.failures++;
    this.lastFailureAt = Date.now();
    if (this.failures >= this.maxFailures) this.openUntil = Date.now() + this.coolDownMs;
  }
}

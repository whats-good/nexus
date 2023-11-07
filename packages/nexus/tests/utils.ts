const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

// retries upon failure, otherwise returns.
// used to test things that are expected to fail sometimes.
export const retry = async (
  retriesLeft: number,
  fn: () => Promise<void>,
  delayMs = 0
): Promise<void> => {
  try {
    await fn();
  } catch (error) {
    if (retriesLeft <= 1) throw error;
    if (delayMs > 0) await delay(delayMs);

    return retry(retriesLeft - 1, fn, delayMs);
  }
};

// throws upon failure, otherwise reruns.
// used to test things that should not fail ever.
export const rerun = async (
  rerunsLeft: number,
  fn: () => Promise<void>,
  delayMs = 0
): Promise<void> => {
  if (rerunsLeft <= 1) return;
  if (delayMs > 0) await delay(delayMs);

  await fn();

  return rerun(rerunsLeft - 1, fn, delayMs);
};

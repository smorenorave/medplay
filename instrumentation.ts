declare global {
  // eslint-disable-next-line no-var
  var medplaySnapshotSchedulerStarted: boolean | undefined;
}

export async function register() {
  if (
    process.env.NEXT_RUNTIME !== "nodejs" ||
    process.env.NEXT_PHASE === "phase-production-build" ||
    global.medplaySnapshotSchedulerStarted
  ) return;
  global.medplaySnapshotSchedulerStarted = true;

  const [{ default: cron }, { refreshAutomaticSnapshots }] = await Promise.all([
    import("node-cron"),
    import("@/lib/monthlySnapshots"),
  ]);

  void refreshAutomaticSnapshots().catch((error) => {
    console.error("[snapshots] No se pudo generar el snapshot inicial", error);
  });

  cron.schedule("10 0 * * *", () => {
    void refreshAutomaticSnapshots().catch((error) => {
      console.error("[snapshots] No se pudo actualizar el snapshot automático", error);
    });
  }, { timezone: "America/Bogota" });
}

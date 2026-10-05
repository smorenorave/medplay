import { Prisma, type PrismaClient } from "../src/generated/prisma";
import { createHash } from "node:crypto";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const auditIdentity = (correo: string, clave: string | null) => createHash("sha256").update(`${Buffer.byteLength(normalizeEmail(correo))}:${normalizeEmail(correo)}${clave ?? ""}`).digest("hex");
const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value, (_key, item) => typeof item === "bigint" ? String(item) : item));

export async function serializable<T>(db: PrismaClient, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 30000 });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (attempt >= 3 || (code !== "P2034" && code !== "P2002")) throw error;
    }
  }
}

/** Global removal; expired selections retain the last platform/type relation in inventory. */
export type DeletionTarget = { tipo: "pantalla" | "completa" | "compartida" | "inventario"; id: string };
export async function deleteEmails(db: PrismaClient, input: { adminId: number; motivo?: string } & ({ correos: string[]; target?: never; expiredTargets?: never } | { target: DeletionTarget; correos?: never; expiredTargets?: never } | { expiredTargets: DeletionTarget[]; correos?: never; target?: never })) {
  if (input.correos && (!input.correos.length || input.correos.length > 100 || input.correos.some(email => !email.trim() || email.trim().length > 191))) throw new Error("invalid-emails");
  return serializable(db, async tx => {
    const actor = await tx.admin.findUnique({ where: { id: input.adminId }, select: { usuario: true } });
    if (!actor) throw new Error("unauthorized");
    let correos = input.correos ?? [];
    for (const target of input.expiredTargets ?? (input.target ? [input.target] : [])) {
      const { tipo, id } = target;
      const row = tipo === "pantalla"
        ? await tx.pantallas.findUnique({ where: { id: Number(id) }, select: { cuentascompartidas: { select: { correo: true } } } })
        : tipo === "completa"
          ? await tx.cuentascompletas.findUnique({ where: { id: BigInt(id) }, select: { correo: true } })
          : tipo === "compartida"
            ? await tx.cuentascompartidas.findUnique({ where: { id: Number(id) }, select: { correo: true } })
            : await tx.inventario.findUnique({ where: { id: Number(id) }, select: { correo: true } });
      const email = row && ("correo" in row ? row.correo : row.cuentascompartidas.correo);
      if (email) correos.push(email);
    }
    correos = [...new Set(correos.map(normalizeEmail))].sort();
    const deleted = { pantallas: 0, compartidas: 0, completas: 0, inventario: 0, clientes: 0 };
    const audits: { id: string; correo: string }[] = [];
    let revision: bigint | undefined;
    for (const correo of correos) {
      // Parameterized SQL also matches legacy whitespace and mixed-case duplicates.
      const sharedIds = await tx.$queryRaw<{ id: number }[]>(Prisma.sql`SELECT id FROM cuentascompartidas WHERE LOWER(TRIM(correo)) = ${correo} FOR UPDATE`);
      const completeIds = await tx.$queryRaw<{ id: bigint }[]>(Prisma.sql`SELECT id FROM cuentascompletas WHERE LOWER(TRIM(correo)) = ${correo} FOR UPDATE`);
      const inventoryIds = await tx.$queryRaw<{ id: number }[]>(Prisma.sql`SELECT id FROM inventario WHERE LOWER(TRIM(correo)) = ${correo} FOR UPDATE`);
      const shared = await tx.cuentascompartidas.findMany({ where: { id: { in: sharedIds.map(row => row.id) } }, include: { plataformas: true } });
      const complete = await tx.cuentascompletas.findMany({ where: { id: { in: completeIds.map(row => row.id) } }, include: { plataformas: true } });
      const inventory = await tx.inventario.findMany({ where: { id: { in: inventoryIds.map(row => row.id) } }, include: { plataformas: true } });
      if (!shared.length && !complete.length && !inventory.length) {
        const previous = await tx.emailDeletionAudit.findMany({ where: { correo } });
        audits.push(...previous.map(row => ({ id: String(row.id), correo })));
        continue; // Retrying a deletion must neither create nor modify its audit.
      }
      const screens = await tx.pantallas.findMany({ where: { cuenta_id: { in: shared.map(row => row.id) } } });
      // Preserve the existing last-record criterion: same type, platform and email.
      // Count the whole selection so a batch containing the final relations also archives.
      const keep = new Map<number, string | null>();
      if (input.expiredTargets) {
        const selectedScreens = new Set(input.expiredTargets.filter(row => row.tipo === "pantalla").map(row => Number(row.id)));
        const selectedComplete = new Set(input.expiredTargets.filter(row => row.tipo === "completa").map(row => BigInt(row.id)));
        for (const row of complete.filter(row => selectedComplete.has(row.id))) {
          const pool = complete.filter(other => other.plataforma_id === row.plataforma_id);
          if (pool.every(other => selectedComplete.has(other.id))) keep.set(row.plataforma_id, row.contrasena);
        }
        for (const row of shared) {
          if (!screens.some(screen => screen.cuenta_id === row.id && selectedScreens.has(screen.id))) continue;
          const accountIds = new Set(shared.filter(other => other.plataforma_id === row.plataforma_id).map(other => other.id));
          const pool = screens.filter(screen => accountIds.has(screen.cuenta_id));
          if (pool.length && pool.some(screen => selectedScreens.has(screen.id)) && pool.every(screen => selectedScreens.has(screen.id))) {
            if (row.plataforma_id == null) throw new Error("No se puede enviar a Inventario una cuenta sin plataforma.");
            keep.set(row.plataforma_id, row.contrasena);
          }
        }
      }
      const keptInventoryIds: number[] = [];
      for (const [plataforma_id, clave] of keep) {
        const kept = await tx.inventario.upsert({ where: { plataforma_id_correo: { plataforma_id, correo } }, create: { plataforma_id, correo, clave }, update: { clave } });
        keptInventoryIds.push(kept.id);
      }
      const contactos = [...new Set([...screens, ...complete].map(row => row.contacto))];
      const clients = await tx.usuarios.findMany({ where: { contacto: { in: contactos } } });
      if (revision === undefined) {
        const next = await tx.accountDataRevision.upsert({ where: { id: 1 }, create: { id: 1, revision: 1n }, update: { revision: { increment: 1n } } });
        revision = next.revision;
      }
      const retainedKeys = new Set([...keep.values()].map(key => key ?? ""));
      const auditEligible = <T extends { plataformas: { auditarEliminaciones?: boolean } | null }>(rows: T[]) => rows.filter(row => row.plataformas && row.plataformas.auditarEliminaciones !== false);
      const eligibleComplete = auditEligible(complete), eligibleShared = auditEligible(shared), eligibleInventory = auditEligible(inventory);
      const keys = [...new Set([...eligibleComplete.map(row => row.contrasena), ...eligibleShared.map(row => row.contrasena), ...eligibleInventory.map(row => row.clave ?? "")])].filter(key => !retainedKeys.has(key));
      for (const clave of keys) {
      const dedupeKey = auditIdentity(correo, clave);
      const previous = await tx.emailDeletionAudit.findUnique({ where: { dedupeKey } })
        ?? (await tx.emailDeletionAudit.findMany({ where: { correo, dedupeKey: null } })).find(row => (row.clave ?? "") === clave);
      const auditShared = eligibleShared.filter(row => row.contrasena === clave);
      const auditComplete = eligibleComplete.filter(row => row.contrasena === clave);
      const auditInventory = eligibleInventory.filter(row => (row.clave ?? "") === clave);
      const auditScreens = screens.filter(row => auditShared.some(account => account.id === row.cuenta_id));
      const auditContacts = [...new Set([...auditScreens, ...auditComplete].map(row => row.contacto))];
      const auditClients = clients.filter(row => auditContacts.includes(row.contacto));
      const platforms = new Map<number, { id: number; nombre: string }>();
      if (Array.isArray(previous?.plataformas)) {
        for (const platform of previous.plataformas) {
          if (platform && typeof platform === "object" && !Array.isArray(platform) && typeof platform.id === "number" && typeof platform.nombre === "string") platforms.set(platform.id, { id: platform.id, nombre: platform.nombre });
        }
      }
      for (const row of [...auditShared, ...auditComplete, ...auditInventory]) {
        if (row.plataformas) platforms.set(row.plataformas.id, { id: row.plataformas.id, nombre: row.plataformas.nombre });
      }
      const fechaEliminacion = new Date();
      const event = json({ fechaEliminacion, adminId: input.adminId, eliminadoPor: actor.usuario, motivo: input.motivo ?? null, cuentascompartidas: auditShared, cuentascompletas: auditComplete, pantallas: auditScreens, inventario: auditInventory, usuarios: auditClients });
      const oldEvents = previous && typeof previous.registros === "object" && previous.registros !== null && !Array.isArray(previous.registros) && Array.isArray(previous.registros.eventos) ? previous.registros.eventos : [];
      const data = {
        claves: previous?.dedupeKey == null && previous ? previous.claves : clave,
        clave,
        plataformas: json([...platforms.values()]), contactos: json([...new Set([...(Array.isArray(previous?.contactos) ? previous.contactos.filter((contact): contact is string => typeof contact === "string") : []), ...auditContacts])]),
        registros: json({ ...(previous && typeof previous.registros === "object" && previous.registros !== null && !Array.isArray(previous.registros) ? previous.registros : {}), eventos: [...oldEvents, event] }),
        identificadorOriginal: [...auditShared.map(row => `compartida:${row.id}`), ...auditComplete.map(row => `completa:${row.id}`), ...auditInventory.map(row => `inventario:${row.id}`)].join(",").slice(0, 255),
        adminId: input.adminId, eliminadoPor: actor.usuario, motivo: input.motivo ?? null, fechaEliminacion, revision,
      };
      const audit = await tx.emailDeletionAudit.upsert({ where: previous ? { id: previous.id } : { dedupeKey }, create: { correo, dedupeKey, ...data }, update: { ...data, dedupeKey } });
      audits.push({ id: String(audit.id), correo });
      }
      deleted.pantallas += (await tx.pantallas.deleteMany({ where: { cuenta_id: { in: shared.map(row => row.id) } } })).count;
      deleted.compartidas += (await tx.cuentascompartidas.deleteMany({ where: { id: { in: shared.map(row => row.id) } } })).count;
      deleted.completas += (await tx.cuentascompletas.deleteMany({ where: { id: { in: complete.map(row => row.id) } } })).count;
      deleted.inventario += (await tx.inventario.deleteMany({ where: { id: { in: inventory.map(row => row.id).filter(id => !keptInventoryIds.includes(id)) } } })).count;
      deleted.clientes += (await tx.usuarios.deleteMany({ where: { contacto: { in: contactos }, pantallas: { none: {} }, cuentascompletas: { none: {} } } })).count;
    }
    if (revision !== undefined) await tx.metricasmensuales.deleteMany({}); // Derived snapshots regenerate from live data.
    else revision = (await tx.accountDataRevision.findUnique({ where: { id: 1 } }))?.revision ?? 0n;
    return { correos, revision: String(revision), deleted, audits };
  });
}

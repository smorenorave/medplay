# Inventario estático de rendimiento

Generado con `node scripts/audit-performance-source.cjs`. Se excluyen dependencias, cliente Prisma generado y builds. Las ubicaciones representan sitios de llamada en el código, **no consultas SQL ejecutadas**. Los helpers, relaciones y ramas pueden producir un número diferente. La latencia de cada endpoint con MySQL real está **no verificada**.

119 archivos; 34 módulos de API.

| Archivo | Líneas | Métodos HTTP | Sitios de llamadas relevantes (línea) |
|---|---:|---|---|
| lib/accountCredentials.ts | 105 | — | findFirst:25; findFirst:30; findFirst:35; updateMany:81; updateMany:85; updateMany:89 |
| lib/accountDataChanges.ts | 78 | — | fetch:64; fetch:72 |
| lib/adminSession.ts | 27 | — | — |
| lib/bogotaDate.ts | 34 | — | — |
| lib/cantidadPantallasDisponibles.ts | 318 | — | — |
| lib/consumeInventory.ts | 28 | — | deleteMany:23 |
| lib/cuentasAll.ts | 144 | — | fetch:63 |
| lib/cuentasCompartidasUpsert.ts | 157 | — | fetch:67; fetch:121; fetch:142 |
| lib/cuentasDisponibles.ts | 560 | — | — |
| lib/cuentasMutationBus.ts | 31 | — | — |
| lib/dailyCache.ts | 51 | — | — |
| lib/dashboardData.ts | 67 | — | findMany:13; findMany:14; aggregate:15; aggregate:20; count:25; count:26; count:27; count:28; count:29; groupBy:30; findMany:31 |
| lib/dataUpdateMessage.ts | 41 | — | — |
| lib/dates.ts | 23 | — | — |
| lib/db.ts | 25 | — | — |
| lib/deleteEmailForRecord.ts | 20 | — | — |
| lib/deletionAuditFilters.ts | 31 | — | — |
| lib/deletionHistory.ts | 72 | — | upsert:36 |
| lib/emailDeletion.ts | 179 | — | update:6; $transaction:12; findUnique:26; findUnique:32; findUnique:34; findUnique:36; findUnique:37; $queryRaw:48; $queryRaw:49; $queryRaw:50; findMany:51; findMany:52; findMany:53; findMany:55; findMany:59; findUnique:116; upsert:119; findMany:123; upsert:125; findUnique:137; findMany:138; upsert:165; deleteMany:168; deleteMany:169; deleteMany:170; deleteMany:171; deleteMany:172; deleteMany:174; findUnique:175 |
| lib/expiredAccountSafety.ts | 13 | — | — |
| lib/expiredBulkDeletion.ts | 92 | — | findUnique:21; findUnique:32; findUnique:42; deleteMany:60; deleteMany:61; upsert:67; update:71; upsert:72; findMany:84; deleteMany:85; deleteMany:87; findUnique:88 |
| lib/expiredDeletionFailure.ts | 56 | — | — |
| lib/inventoryChanges.ts | 37 | — | — |
| lib/mailer.ts | 59 | — | — |
| lib/monthlySnapshots.ts | 242 | — | findMany:47; findMany:60; count:132; count:135; upsert:147; findUnique:182 |
| lib/pagination.ts | 7 | — | — |
| lib/pantallaPin.ts | 7 | — | — |
| lib/pantallas.ts | 23 | — | fetch:2 |
| lib/pantallasMutationBus.ts | 133 | — | — |
| lib/passwordChanges.ts | 56 | — | — |
| lib/requireAdmin.ts | 8 | — | findUnique:6 |
| lib/restoreDeletedRecord.ts | 96 | — | findUnique:37; findUnique:39; findUnique:48; findUnique:58; findUnique:62; findUnique:64; $queryRaw:67; findMany:68; findMany:71; create:72; findUnique:75; $queryRaw:76; findMany:77; findUnique:81; create:84; create:86; create:87; upsert:89; update:91; deleteMany:92 |
| lib/routeTiming.ts | 10 | — | — |
| lib/serializers.ts | 48 | — | — |
| lib/sessionPolicy.ts | 6 | — | — |
| lib/sessionResponse.ts | 19 | — | — |
| lib/settleWithConcurrency.ts | 20 | — | — |
| lib/strings.ts | 26 | — | — |
| lib/whatsappContacto.ts | 33 | — | — |
| scripts/audit-performance-source.cjs | 22 | — | readFileSync:10; writeFileSync:20 |
| scripts/benchmark-browser.cjs | 75 | — | spawn:8; fetch:12; count:47; writeFileSync:70 |
| scripts/benchmark-crud.cjs | 36 | — | readFileSync:11; writeFileSync:32 |
| scripts/benchmark-deletion.cjs | 41 | — | readFileSync:7; $transaction:15; writeFileSync:36 |
| scripts/benchmark-performance.cjs | 57 | — | readFileSync:17; writeFileSync:52 |
| scripts/cloudflared-medplay.js | 15 | — | spawn:3 |
| scripts/diagnose-performance.cjs | 57 | — | writeFileSync:53 |
| scripts/enviar_vencidos.js | 1134 | — | readFileSync:135; readFileSync:162; writeFileSync:163; readFileSync:180; execSync:244; execSync:246; count:293; count:463; spawn:783; spawn:789 |
| scripts/hash-admins.ts | 1 | — | — |
| scripts/notify-password-changes.js | 3060 | — | writeFileSync:129; spawn:319; spawn:342; count:720; count:1419 |
| scripts/pm2-next.js | 17 | — | spawn:3 |
| scripts/prepare-database.cjs | 53 | — | — |
| scripts/whatsapp-contact.js | 38 | — | — |
| src/app/admin/deletions/page.tsx | 132 | — | fetch:44; fetch:54; fetch:67; fetch:79 |
| src/app/admin/layout.tsx | 11 | — | — |
| src/app/admin/page.tsx | 792 | — | fetch:157; fetch:355; fetch:386; fetch:412 |
| src/app/admin/settings/page.tsx | 55 | — | fetch:28; fetch:38 |
| src/app/api/account-credentials/route.ts | 54 | POST | $transaction:24 |
| src/app/api/account-data-revision/route.ts | 18 | GET | findUnique:8; $transaction:11; findUnique:12; findMany:13 |
| src/app/api/account-deletions/route.ts | 23 | DELETE | — |
| src/app/api/admin/dashboard/route.ts | 13 | GET | — |
| src/app/api/admin/deletions/restore/route.ts | 24 | POST | — |
| src/app/api/admin/deletions/route.ts | 40 | GET | findUnique:11; findMany:15; findUnique:28; $transaction:34; count:35; findMany:36 |
| src/app/api/admin/login/route.ts | 91 | POST | findUnique:41; create:46; delete:51; create:52 |
| src/app/api/admin/logout/route.ts | 12 | POST | — |
| src/app/api/admin/mail-status/route.ts | 22 | GET, POST | — |
| src/app/api/admin/password-recovery/request/route.ts | 72 | POST | findUnique:32; update:36; $transaction:39; deleteMany:40; create:41; create:56; create:58; updateMany:63; create:65 |
| src/app/api/admin/password-recovery/reset/route.ts | 53 | POST | update:25; findUnique:26; create:29; $transaction:35; updateMany:36; update:41; updateMany:42; create:46 |
| src/app/api/admin/recovery-email/route.ts | 38 | GET, PATCH | findUnique:14; $transaction:28; update:29; create:30 |
| src/app/api/admin/settings/deletion-audit/route.ts | 41 | GET, PUT | findMany:20; count:31; updateMany:32; findMany:33 |
| src/app/api/cuentascompartidas/[id]/route.ts | 254 | GET, PATCH, PUT, DELETE | findUnique:45; findUnique:118; updateMany:130; update:144; update:160; $transaction:211; findUnique:212; count:218; delete:233 |
| src/app/api/cuentascompartidas/route.ts | 116 | GET, POST | findMany:25; findFirst:74; update:85; create:100 |
| src/app/api/cuentascompletas/[id]/route.ts | 465 | PUT, GET, PATCH, DELETE | findUnique:158; findUnique:180; findUnique:206; $transaction:263; update:266; update:270; findUnique:284; count:295; findUnique:300; $transaction:304; update:306; update:314; $transaction:326; create:329; update:333; count:342; delete:346; findUnique:358; findUnique:389; $transaction:407; delete:426; count:434; count:435; deleteMany:440 |
| src/app/api/cuentascompletas/route.ts | 343 | GET, POST | findMany:146; $transaction:266; upsert:269; create:277 |
| src/app/api/cuentascompletas/stamp/route.ts | 39 | GET | aggregate:7; aggregate:20 |
| src/app/api/cuentasvencidas/delete/route.ts | 77 | DELETE, GET | findUnique:49; $transaction:56; findUnique:57; findUnique:58; $queryRaw:61; $queryRaw:62; findMany:63; findMany:64; findMany:65 |
| src/app/api/cuentasvencidas/route.ts | 126 | POST | writeFileSync:28; spawn:101 |
| src/app/api/dashboard/route.ts | 16 | GET | — |
| src/app/api/hours-report/route.ts | 111 | POST | — |
| src/app/api/inventario/[id]/route.ts | 105 | PATCH, DELETE | update:39; $transaction:76; findUnique:77; delete:93 |
| src/app/api/inventario/route.ts | 167 | GET, POST, PATCH | findMany:45; upsert:88; update:140 |
| src/app/api/metricas-mensuales/route.ts | 140 | GET, POST | — |
| src/app/api/pantallas/[id]/route.ts | 707 | PUT, GET, PATCH, DELETE | findUnique:129; $transaction:189; findUnique:191; findUniqueOrThrow:206; findUnique:216; create:221; update:313; findUnique:331; update:368; update:382; findFirst:418; update:434; create:441; update:453; count:460; delete:467; findUnique:476; update:508; findUnique:532; $transaction:603; findUnique:604; delete:652; count:656; delete:660; count:665; count:668; deleteMany:674 |
| src/app/api/pantallas/route.ts | 493 | GET, POST | findMany:201; $transaction:314; create:317; update:327; findFirst:346; update:362; create:369; findFirst:383; update:399; findUniqueOrThrow:411; create:416 |
| src/app/api/pantallas/stamp/route.ts | 59 | GET | findFirst:29; count:30; findFirst:32; count:33; findFirst:36; count:37 |
| src/app/api/plataformas/[id]/route.ts | 200 | GET, PATCH, DELETE, OPTIONS | findUnique:47; update:121; $transaction:157; findUnique:158; delete:176 |
| src/app/api/plataformas/route.ts | 143 | GET, POST, OPTIONS | findMany:21; create:107 |
| src/app/api/session/me/route.ts | 7 | GET | — |
| src/app/api/session/ping/route.ts | 13 | POST | — |
| src/app/api/usuarios/[contacto]/route.ts | 101 | GET, PUT, PATCH, DELETE, OPTIONS | findUnique:23; update:42; $transaction:67; count:68; count:69; delete:82 |
| src/app/api/usuarios/route.ts | 55 | GET, POST | findMany:16; create:40 |
| src/app/layout.tsx | 29 | — | — |
| src/app/page.tsx | 445 | — | fetch:70; fetch:86; fetch:108; fetch:124 |
| src/app/restablecer-clave/page.tsx | 67 | — | fetch:21 |
| src/components/AccountDataSync.tsx | 40 | — | fetch:20; setInterval:32 |
| src/components/AdminSalesSummary.tsx | 29 | — | fetch:15 |
| src/components/CopyDataUpdateButton.tsx | 83 | — | — |
| src/components/FloatingTimer.tsx | 185 | — | — |
| src/components/OperationsDashboard.tsx | 81 | — | fetch:27 |
| src/components/RecoveryEmailSettings.tsx | 67 | — | fetch:16; fetch:17; fetch:30 |
| src/components/SalesMetricsPanel.tsx | 20 | — | — |
| src/components/SessionGuard.tsx | 84 | — | fetch:65; setInterval:72 |
| src/components/WorkTimers.tsx | 329 | — | setInterval:110; fetch:202 |
| src/components/forms/FormCuentasCompletas.tsx | 1855 | — | fetch:162; fetch:320; fetch:467; setInterval:538; fetch:581; fetch:733; fetch:1059; fetch:1198; fetch:1389 |
| src/components/forms/FormPantallas.tsx | 2431 | — | fetch:249; fetch:264; fetch:531; setInterval:610; fetch:725; fetch:1030; fetch:1114; fetch:1117; fetch:1482; fetch:1579; fetch:1776 |
| src/components/ui/Field.tsx | 70 | — | — |
| src/components/ui/FieldPantallas.tsx | 67 | — | — |
| src/components/ui/ResultsPagination.tsx | 14 | — | — |
| src/components/ui/TextArea.tsx | 30 | — | — |
| src/components/viewers/CuentasCompletasViewer.tsx | 2099 | — | fetch:139; fetch:155; fetch:237; fetch:262; fetch:365; fetch:655; fetch:768; delete:806; delete:821; fetch:844; fetch:902; fetch:938; delete:954; fetch:985; fetch:1089; delete:1106; fetch:1486 |
| src/components/viewers/CuentasVencidasViewer.tsx | 1892 | — | fetch:189; update:302; fetch:597; fetch:753; delete:872; delete:1138; delete:1190 |
| src/components/viewers/PantallasViewer.tsx | 2711 | — | fetch:139; fetch:156; fetch:244; fetch:269; fetch:283; fetch:484; fetch:487; fetch:724; fetch:736; fetch:953; fetch:1095; fetch:1184; delete:1254; delete:1269; fetch:1292; fetch:1355; fetch:1390; delete:1406; fetch:1437; fetch:1544; delete:1561; fetch:2018 |
| src/components/viewers/PlataformasContactosViewer.tsx | 1813 | — | fetch:232; fetch:266; fetch:337; fetch:390; fetch:794; fetch:828; fetch:883; fetch:919; fetch:1163; fetch:1209; fetch:1248; fetch:1300 |
| src/hooks/useAccountDataRefresh.ts | 10 | — | — |
| src/hooks/useCredentialAutofill.ts | 123 | — | fetch:65 |
| src/hooks/useInventoryRefresh.ts | 15 | — | — |
| src/hooks/usePageWindow.ts | 18 | — | — |
| src/hooks/usePlataformas.ts | 171 | — | fetch:127; fetch:152 |
| src/middleware.ts | 89 | — | — |
| src/types/pantallas.ts | 27 | — | — |

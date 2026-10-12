// Read-only diagnostics. Default: local resources only. --database explicitly
// enables metadata, SELECT 1 and EXPLAIN; never executes DDL, CRUD or ANALYZE.
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { monitorEventLoopDelay } = require('node:perf_hooks');
const { loadEnvConfig } = require('@next/env');
const root = path.resolve(__dirname,'..');
function cpuTotals() { return os.cpus().reduce((sum,cpu)=>{sum.idle+=cpu.times.idle;sum.total+=Object.values(cpu.times).reduce((a,b)=>a+b,0);return sum;},{idle:0,total:0}); }
async function main() {
  loadEnvConfig(root,false, { info:()=>{},error:()=>{} });
  const eventLoop=monitorEventLoopDelay({resolution:10}); eventLoop.enable();
  const start=cpuTotals(); await new Promise(r=>setTimeout(r,1000)); const finish=cpuTotals(); eventLoop.disable();
  const disk=fs.statfsSync(root);
  const report={
    measuredAt:new Date().toISOString(), scope:'This machine and diagnostic process only; not evidence of production saturation',
    host:{cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,cpuBusyPercent:+(100*(1-(finish.idle-start.idle)/(finish.total-start.total))).toFixed(2),totalMemoryBytes:os.totalmem(),freeMemoryBytes:os.freemem(),diskFreeBytes:disk.bavail*disk.bsize},
    diagnosticProcess:{rssBytes:process.memoryUsage().rss,eventLoopP95Ms:+(eventLoop.percentile(95)/1e6).toFixed(3)},
    database:{configured:Boolean(process.env.DATABASE_URL),status:'not verified'},
  };
  if(process.argv.includes('--database') && process.env.DATABASE_URL) {
    let connection;
    try {
      const url=new URL(process.env.DATABASE_URL);
      // Do not silently ignore Prisma-specific TLS/certificate options.
      if ([...url.searchParams.keys()].some(key=>/ssl|tls/i.test(key))) throw Object.assign(new Error('TLS configuration requires a configured database client'),{code:'TLS_OPTIONS_REQUIRE_CONFIGURED_CLIENT'});
      connection=await require('mysql2/promise').createConnection({host:url.hostname,port:Number(url.port||3306),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:decodeURIComponent(url.pathname.slice(1)),connectTimeout:5000,multipleStatements:false});
      // Enforce read-only semantics on this session as an additional safeguard.
      await connection.query('SET SESSION TRANSACTION READ ONLY');
      const query=async(sql,args=[])=>{const [rows]=await connection.query({sql,timeout:5000},args);return rows;};
      const latencies=[];
      for(let i=0;i<10;i++){const t=performance.now();await query('SELECT 1');latencies.push(performance.now()-t);}
      latencies.sort((a,b)=>a-b);
      report.database={configured:true,status:'read-only measurements',roundTripSelect1MedianMs:+latencies[5].toFixed(3),
        version:await query('SELECT VERSION() AS version'),
        tables:await query('SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()'),
        indexes:await query('SELECT TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX, COLUMN_NAME, NON_UNIQUE FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE()'),
        statusCounters:await query("SHOW GLOBAL STATUS WHERE Variable_name IN ('Threads_connected','Threads_running','Slow_queries','Innodb_row_lock_waits','Innodb_row_lock_time','Innodb_buffer_pool_reads','Innodb_buffer_pool_read_requests')"),
        settings:await query("SHOW VARIABLES WHERE Variable_name IN ('max_connections','innodb_buffer_pool_size','slow_query_log','long_query_time')"), plans:[]};
      const plans=[
        ['screen-list','SELECT id FROM pantallas ORDER BY fecha_vencimiento ASC, id ASC LIMIT 501',[]],
        ['screen-month','SELECT total_pagado,total_ganado,cuenta_id FROM pantallas WHERE fecha_compra >= ?',['2026-10-01']],
        ['complete-month','SELECT total_pagado_completa,total_ganado,plataforma_id FROM cuentascompletas WHERE fecha_compra >= ?',['2026-10-01']],
        ['expired-screen','SELECT id FROM pantallas WHERE fecha_vencimiento <= ?',['2026-10-10']],
        ['credential','SELECT id FROM cuentascompartidas WHERE plataforma_id = ? AND correo = ? ORDER BY id DESC LIMIT 1',[1,'diagnostic@example.invalid']],
        ['normalized-email','SELECT id FROM cuentascompartidas WHERE LOWER(TRIM(correo)) = ?',['diagnostic@example.invalid']],
      ];
      for(const [name,sql,args] of plans) report.database.plans.push({name,explain:await query('EXPLAIN '+sql,args)});
    } catch(error) { report.database.status='not verified / incomplete'; report.database.errorCode=error.code||'diagnostic_failed'; }
    finally { if(connection) await connection.end(); }
  }
  const output=process.argv.find(arg=>arg.startsWith('--out='))?.slice(6);
  if(output) fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error.code||'diagnostic_failed');process.exitCode=1;});

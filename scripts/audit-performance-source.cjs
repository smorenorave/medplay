// Static inventory, not a runtime SQL counter or a substitute for profiling.
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
function walk(dir) {return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.name==='generated'?[]:entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);}
const files=['src','lib','scripts'].flatMap(dir=>walk(path.join(root,dir))).filter(file=>/\.(tsx?|c?js)$/.test(file)).sort();
const models=new Set(['findMany','findFirst','findUnique','findUniqueOrThrow','count','aggregate','groupBy','create','createMany','upsert','update','updateMany','delete','deleteMany','$queryRaw','$transaction']);
const inventory=files.map(file=>{
  const source=fs.readFileSync(file,'utf8'); const tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
  const calls=[];
  function visit(node) {if(ts.isCallExpression(node)) {const expression=node.expression;const name=ts.isPropertyAccessExpression(expression)?expression.name.text:expression.getText(tree); if(models.has(name)||['fetch','setInterval','readFileSync','writeFileSync','spawn','execSync'].includes(name)) calls.push({name,line:tree.getLineAndCharacterOfPosition(node.getStart(tree)).line+1});}ts.forEachChild(node,visit);}
  visit(tree);
  const methods=[...source.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PATCH|PUT|DELETE|OPTIONS)\b/g)].map(match=>match[1]);
  return {file:path.relative(root,file).replaceAll('\\','/'),lines:source.split('\n').length,methods,calls};
});
let out='# Inventario estático de rendimiento\n\nGenerado con `node scripts/audit-performance-source.cjs`. Se excluyen dependencias, cliente Prisma generado y builds. Las ubicaciones representan sitios de llamada en el código, **no consultas SQL ejecutadas**. Los helpers, relaciones y ramas pueden producir un número diferente. La latencia de cada endpoint con MySQL real está **no verificada**.\n\n';
out+=`${inventory.length} archivos; ${inventory.filter(row=>row.file.endsWith('/route.ts')).length} módulos de API.\n\n| Archivo | Líneas | Métodos HTTP | Sitios de llamadas relevantes (línea) |\n|---|---:|---|---|\n`;
for(const row of inventory) out+=`| ${row.file} | ${row.lines} | ${row.methods.join(', ')||'—'} | ${row.calls.map(call=>`${call.name}:${call.line}`).join('; ')||'—'} |\n`;
fs.writeFileSync(path.join(root,'docs/performance-source-inventory.md'),out);
console.log(JSON.stringify({files:inventory.length,routes:inventory.filter(row=>row.file.endsWith('/route.ts')).length,lines:inventory.reduce((sum,row)=>sum+row.lines,0)}));

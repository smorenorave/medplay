// Reuses the existing transactional regression fixture, without registering tests.
// Timings include an explicitly simulated 2 ms/model-operation delay, NOT MySQL.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { AsyncLocalStorage } = require('node:async_hooks');
const internal = new AsyncLocalStorage();
const filename = path.resolve(__dirname,'../tests/inventoryConsumption.test.cjs');
const localRequire = createRequire(filename);
const source = fs.readFileSync(filename,'utf8');
const testModule = { exports:{} };
const context = { require: name => name==='node:test' ? {test:()=>{}} : localRequire(name), module:testModule, exports:testModule.exports, __dirname:path.dirname(filename), __filename:filename, global, Request, Response, structuredClone, console, Buffer, setTimeout, process };
vm.runInNewContext(source+'\nmodule.exports = {fixture, flows, payload, call, setActive: value => active = value};',context,{filename});
const {fixture,flows,call,setActive}=testModule.exports;
async function main() {
  const result={environment:'Actual CRUD handlers; in-memory transactional adapter; simulated 2 ms per model call. Counts are ORM calls, not SQL statements.',flows:[]};
  for(const flow of flows) {
    const times=[]; let operations;
    for(let n=0;n<5;n++) {
      const f=fixture(); setActive(f); operations=[];
      for(const [model, api] of Object.entries(f.db)) {
        if(typeof api!=='object') continue;
        for(const [method,fn] of Object.entries(api)) if(typeof fn==='function') api[method]=async(...args)=>{if(internal.getStore()) return fn(...args); operations.push(`${model}.${method}`);await new Promise(resolve=>setTimeout(resolve,2));return internal.run(true,()=>fn(...args));};
      }
      const start=performance.now(); const response=await call(flow); times.push(performance.now()-start);
      if(!response.ok) throw Error(`${flow.name}: ${response.status}`);
    }
    times.sort((a,b)=>a-b);
    result.flows.push({name:flow.name,medianMs:+times[2].toFixed(3),ormCalls:operations.length,operations});
  }
  if(process.argv[2]) fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});

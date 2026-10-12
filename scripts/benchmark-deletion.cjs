const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createRequire}=require('node:module');
function fixtureFrom(file,extra) {
  const filename=path.resolve(__dirname,'../tests',file), requireFile=createRequire(filename), module={exports:{}};
  const source=fs.readFileSync(filename,'utf8');
  vm.runInNewContext(source.slice(0,source.search(/^.*\btest\(/m))+`\nmodule.exports = {fixture, ${extra}};`,{module,require:requireFile,__dirname:path.dirname(filename),__filename:filename,structuredClone,console,global,process,Request,Response,Buffer,setTimeout},{filename});
  return module.exports;
}
const globalDeletion=fixtureFrom('emailDeletion.test.cjs','deleteEmails');
const bulkDeletion=fixtureFrom('expiredDeletion.regression.test.cjs','deleteExpiredBulk');
function instrument(db,operations) {
  return new Proxy(db,{get(target,key){
    if(key==='$transaction') return (work,opts)=>target.$transaction(tx=>work(instrument(tx,operations)),opts);
    const value=target[key];
    if(typeof value==='object' && value) return new Proxy(value,{get(api,method){return (...args)=>{operations.push(`${String(key)}.${String(method)}`);return api[method](...args);};}});
    if(typeof value==='function') return (...args)=>{operations.push(String(key));return value(...args);};
    return value;
  }});
}
async function main() {
  const output={environment:'In-memory transactional adapters; real deletion functions; no MySQL, no artificial latency. ORM calls can expand to multiple SQL statements.',scenarios:[]};
  for(const kind of ['global-one-email','expired-complete-100','expired-screen-100']) {
    const samples=[];let operations;
    for(let i=0;i<5;i++) {
      const f=kind==='global-one-email'?globalDeletion.fixture():bulkDeletion.fixture(kind.includes('complete')?'completa':'pantalla',100);
      operations=[];const db=instrument(f.db,operations),start=performance.now();
      if(kind==='global-one-email') await globalDeletion.deleteEmails(db,{adminId:1,correos:['test@example.com']});
      else await bulkDeletion.deleteExpiredBulk(db,{adminId:1,confirmed:true,targets:Array.from({length:100},(_,i)=>({tipo:kind.includes('complete')?'completa':'pantalla',id:String(i+1)}))});
      samples.push(performance.now()-start);
    }
    samples.sort((a,b)=>a-b);
    output.scenarios.push({kind,medianMs:+samples[2].toFixed(3),ormAndRawCalls:operations.length,callsByMethod:Object.fromEntries([...new Set(operations)].map(method=>[method,operations.filter(v=>v===method).length]))});
  }
  if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(output,null,2)+'\n');
  console.log(JSON.stringify(output,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});

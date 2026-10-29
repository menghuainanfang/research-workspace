const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const katex=require('../../移动网格/tools/vendor/katex.min.js');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]),nodes={};
const ctx=new Proxy({},{get:()=>()=>{}});
for(const id of ids)nodes[id]={value:({profile:'sine',nu:'0.03',speed:'1',frame:'0',cell:'80'})[id]||'',checked:true,textContent:'',innerHTML:'',getBoundingClientRect:()=>({width:600,height:320,left:0,top:0}),getContext:()=>ctx};
let callback;
const context=vm.createContext({document:{getElementById:id=>nodes[id],querySelectorAll:()=>[],addEventListener:()=>{}},window:{addEventListener:()=>{}},devicePixelRatio:1,katex,requestAnimationFrame:f=>callback=f,console});
vm.runInContext([...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1],context);
for(const nu of ['0.01','0.03','0.1']){nodes.nu.value=nu;nodes.nu.onchange();nodes.frame.value='100';nodes.frame.oninput();assert.equal(nodes.time.textContent,'t = 1.000');assert(!nodes.plot.innerHTML.includes('NaN'));assert(nodes['balance-formula'].innerHTML.includes('<math'));}
nodes.profile.value='exact';nodes.profile.onchange();assert(nodes.nu.disabled);nodes.play.onclick();callback(200);assert.notEqual(nodes.time.textContent,'t = 0.000');nodes.reset.onclick();assert.equal(nodes.time.textContent,'t = 0.000');
for(const i of [0,159]){nodes.cell.value=String(i);nodes.cell.oninput();assert(!nodes['cell-plot'].innerHTML.includes('NaN'));}
const data=JSON.parse(fs.readFileSync(__dirname+'/results.json','utf8'));
let checked=0;
for(const c of data.cases)for(let j=1;j<c.times.length;j++){const b=c.budgets[j];for(let i=0;i<=c.n;i++){assert(Math.abs(b.rate[i]-b.advection[i]-b.diffusion[i])<1e-7);assert(Math.abs(b.rate[i]-(c.u[j][i]-b.previous[i])/c.dt)<1e-10);checked++;}}
console.log('PASS: cases, exact solution, time controls, boundary cells, MathML, finite geometry and '+checked+' recorded node/time balances.');

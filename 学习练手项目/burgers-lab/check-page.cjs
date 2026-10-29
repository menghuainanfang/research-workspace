const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const nodes={};for(const id of ['profile','nu','speed','play','reset','frame','initial','plot','time','peak','energy','ratio','observation','errors','validation','provenance'])nodes[id]={value:({profile:'sine',nu:'0.03',speed:'1',frame:'0'})[id]||'',textContent:'',innerHTML:''};
let callback;const context=vm.createContext({document:{getElementById:id=>nodes[id]},requestAnimationFrame:f=>callback=f,console});
vm.runInContext(html.match(/<script>([\s\S]*)<\/script>/)[1],context);
assert(nodes.plot.innerHTML.includes('<path'));assert(!nodes.plot.innerHTML.includes('NaN'));
for(const nu of ['0.01','0.03','0.1']){nodes.nu.value=nu;nodes.nu.onchange();nodes.frame.value='100';nodes.frame.oninput();assert(nodes.time.textContent==='t = 1.000');assert(!nodes.plot.innerHTML.includes('NaN'))}
nodes.profile.value='exact';nodes.profile.onchange();assert(nodes.nu.disabled);nodes.play.onclick();callback(200);assert(nodes.time.textContent!=='t = 0.000');nodes.reset.onclick();assert(nodes.time.textContent==='t = 0.000');assert(nodes.errors.innerHTML.includes('2.00'));console.log('PASS: parameter selection, exact overlay, time slider, play, reset, finite SVG coordinates.');

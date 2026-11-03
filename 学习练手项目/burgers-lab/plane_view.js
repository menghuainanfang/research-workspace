/* Fixed-plane Burgers evolution and recorded nonlinear finite-element solves. */
(function(){
  'use strict';
  function nodeEquation(data,nu,known,frozen,candidate,index,method="picard"){
    const entries=new Map();
    data.cells.forEach((cell,t)=>{
      const i=cell.indexOf(index);if(i<0)return;
      const area=data.areas[t],grad=data.gradients[t];
      let convectionWeight=0,newWeight=0,oldWeight=0,slope=0;
      cell.forEach((v,l)=>{const m=area*(i===l?2:1)/12;convectionWeight+=m*frozen[v];newWeight+=m*candidate[v];oldWeight+=m*known[v];slope+=known[v]*(grad[l][0]+grad[l][1]);});
      cell.forEach((v,l)=>{
        const e=entries.get(v)||{index:v,mass:0,diffusion:0,advection:0,newAdvection:0,explicit:0};
        e.mass+=area*(i===l?2:1)/(12*data.dt);
        e.diffusion+=nu*area*(grad[i][0]*grad[l][0]+grad[i][1]*grad[l][1]);
        e.advection+=method==="imex"?0:method==="reaction"?area*(i===l?2:1)/12*slope:convectionWeight*(grad[l][0]+grad[l][1]);e.explicit+=oldWeight*(grad[l][0]+grad[l][1]);
        e.newAdvection+=newWeight*(grad[l][0]+grad[l][1]);entries.set(v,e);
      });
    });
    const rows=[...entries.values()].sort((a,b)=>a.index-b.index);
    let rhs=0,time=0,diffusion=0,advection=0,newAdvection=0;
    for(const e of rows){e.coefficient=e.mass+e.diffusion+e.advection;rhs+=e.mass*known[e.index]-(method==="imex"?e.explicit*known[e.index]:0);time+=e.mass*(candidate[e.index]-known[e.index]);diffusion+=e.diffusion*candidate[e.index];advection+=method==="imex"?e.explicit*known[e.index]:e.advection*candidate[e.index];newAdvection+=e.newAdvection*candidate[e.index];}
    return {rows,rhs,time,diffusion,advection,newAdvection,linearResidual:time+diffusion+advection,nonlinearResidual:time+diffusion+newAdvection};
  }
  if(typeof module!=='undefined'&&module.exports){module.exports={nodeEquation};return;}
  async function boot(){
    const packed=JSON.parse(document.getElementById('plane-data').textContent);
    const bytes=Uint8Array.from(atob(packed),c=>c.charCodeAt(0));
    const d=JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
    const $=id=>document.getElementById(id),math=s=>katex.renderToString(s,{output:'mathml',displayMode:true,throwOnError:true});
    const number=x=>x===null?'—':Math.abs(x)<1e-3&&x!==0?x.toExponential(3):Number(x).toFixed(5);
    const texNumber=x=>number(x).replace(/e([+-]?\d+)/,'\\times10^{$1}');
    const colors={'0.01':'#256ca4','0.02':'#087b69','0.05':'#bc731f','0.1':'#885c97'};
    let n=0,k=0,timer=null,innerTimer=null,tracked=0;
    const keys=d.viscosities.map(String),last=d.times.length-1,caseAt=nu=>d.cases[$('scheme').value+'_'+nu],current=()=>caseAt($('viscosity').value);
    Object.entries(d.methods).forEach(([key,label])=>{const o=document.createElement('option');o.value=key;o.textContent=label;$('scheme').append(o);});
    const ordered=d.cells.map(cell=>({cell,depth:cell.reduce((s,i)=>s+d.nodes[i][0]+d.nodes[i][1],0)})).sort((a,b)=>b.depth-a.depth);
    tracked=d.nodes.reduce((b,p,i)=>Math.hypot(p[0]-.5,p[1]-.5)<Math.hypot(d.nodes[b][0]-.5,d.nodes[b][1]-.5)?i:b,0);
    keys.forEach(key=>{for(const id of ['viscosity','comparison']){const o=document.createElement('option');o.value=key;o.textContent='ν = '+key;$(id).append(o);}});
    $('viscosity').value='0.02';$('comparison').value='0.1';$('timeline').max=last;
    $('legend').innerHTML=keys.map(key=>`<span style="color:${colors[key]}">● ν=${key}</span>`).join(' ');
    function pause(){clearInterval(timer);clearInterval(innerTimer);timer=null;innerTimer=null;$('play').textContent='播放时间演化';$('inner-play').textContent='重演本步求解';}
    function surface(id,height){const c=$(id),w=c.getBoundingClientRect().width,h=height||w,r=devicePixelRatio||1;c.width=w*r;c.height=h*r;const ctx=c.getContext('2d');ctx.scale(r,r);return {c,ctx,w,h};}
    const color=v=>`hsl(${220-220*Math.max(0,Math.min(1,v))} 70% ${30+25*Math.max(0,Math.min(1,v))}%)`;
    function plane(id,u,{difference=false,interactive=false}={}){
      const {c,ctx,w,h}=surface(id),p=xy=>[30+xy[0]*(w-60),h-30-xy[1]*(h-60)];
      const max=Math.max(...u.map(Math.abs),1e-14);
      d.cells.forEach(cell=>{ctx.beginPath();cell.forEach((i,j)=>j?ctx.lineTo(...p(d.nodes[i])):ctx.moveTo(...p(d.nodes[i])));ctx.closePath();const value=cell.reduce((s,i)=>s+u[i],0)/3;
        ctx.fillStyle=difference?`hsl(${value>=0?15:210} ${Math.abs(value)/max*75}% ${96-Math.abs(value)/max*48}%)`:color(value);ctx.fill();
        if($('grid').checked){ctx.strokeStyle=difference?'rgba(70,90,90,.15)':'rgba(255,255,255,.23)';ctx.lineWidth=.4;ctx.stroke();}});
      if(!difference){const initial=current().metrics[0].peak_index;ctx.strokeStyle='white';ctx.lineWidth=2;ctx.beginPath();ctx.arc(...p(d.nodes[initial]),6,0,2*Math.PI);ctx.stroke();
        if($('arrows').checked)for(let i=0;i<d.nodes.length;i++){const [x,y]=d.nodes[i];if(Math.round(x*d.n)%4||Math.round(y*d.n)%4||u[i]<.03)continue;const [a,b]=p(d.nodes[i]),len=u[i]*24;ctx.strokeStyle='white';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(a+len,b-len);ctx.lineTo(a+len-5,b-len+1);ctx.moveTo(a+len,b-len);ctx.lineTo(a+len-1,b-len+5);ctx.stroke();}}
      ctx.fillStyle='#182c2b';ctx.beginPath();ctx.arc(...p(d.nodes[tracked]),4,0,2*Math.PI);ctx.fill();ctx.font='12px system-ui';ctx.fillText('y ↑',8,18);ctx.fillText('x →',w-42,h-8);ctx.fillText(difference?'本步增量：蓝色减少 / 橙色增加':'固定色标：0 蓝 → 1 红',32,17);
      if(interactive)c.onclick=e=>{pause();const rect=c.getBoundingClientRect(),x=(e.clientX-rect.left-30)/(w-60),y=1-(e.clientY-rect.top-30)/(h-60);tracked=d.nodes.reduce((b,p,i)=>Math.hypot(p[0]-x,p[1]-y)<Math.hypot(d.nodes[b][0]-x,d.nodes[b][1]-y)?i:b,0);draw();};
    }
    function heightView(u){const {ctx,w}=surface('right-view'),q=(p,z)=>[w*.5+(p[0]-p[1])*w*.4,w*.69-(p[0]+p[1])*w*.22-z*w*.35];
      ordered.forEach(({cell})=>{ctx.beginPath();cell.forEach((i,j)=>j?ctx.lineTo(...q(d.nodes[i],u[i])):ctx.moveTo(...q(d.nodes[i],u[i])));ctx.closePath();ctx.fillStyle=color(cell.reduce((s,i)=>s+u[i],0)/3);ctx.fill();if($('grid').checked){ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=.35;ctx.stroke();}});ctx.fillStyle='#203e3a';ctx.font='12px system-ui';ctx.fillText('高度 = u（各黏性使用同一比例）',12,18);ctx.fillText('x',w*.88,w*.5);ctx.fillText('y',w*.1,w*.5);}
    function history(id,field,normalized){const {c,ctx,w}=surface(id,190),x=i=>45+(w-65)*i/last,y=v=>150-130*v;ctx.font='11px system-ui';ctx.fillStyle='#647670';ctx.strokeStyle='#dce6e1';for(const v of [0,.5,1]){ctx.fillText(v.toFixed(1),12,y(v)+4);ctx.beginPath();ctx.moveTo(40,y(v));ctx.lineTo(w-15,y(v));ctx.stroke();}
      for(const key of keys){const model=caseAt(key);ctx.strokeStyle=colors[key];ctx.lineWidth=key===$('viscosity').value?3:1.4;ctx.globalAlpha=key===$('viscosity').value?1:.65;ctx.beginPath();model.metrics.forEach((m,i)=>{const v=normalized?m[field]/model.metrics[0][field]:m[field];i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v));});ctx.stroke();}ctx.globalAlpha=1;ctx.setLineDash([4,4]);ctx.strokeStyle='#203e3a';ctx.beginPath();ctx.moveTo(x(n),10);ctx.lineTo(x(n),155);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#647670';ctx.fillText('t=0',40,179);ctx.fillText('t='+d.times[last].toFixed(2),w-60,179);c.onclick=e=>{pause();const rect=c.getBoundingClientRect();selectTime(Math.round((e.clientX-rect.left-45)/(w-65)*last));};}
    function residualPlot(states){const {c,ctx,w}=surface('residual',220),logs=states.map(s=>Math.log10(Math.max(s.relative_residual,1e-16))),hi=Math.ceil(Math.max(...logs,-9))+1,lo=Math.floor(Math.min(...logs,-9))-1;
      const x=i=>55+(w-75)*i/Math.max(1,states.length-1),y=v=>175-150*(v-lo)/(hi-lo);ctx.font='11px system-ui';ctx.fillStyle='#647670';ctx.strokeStyle='#e2e8e4';for(let v=lo;v<=hi;v+=Math.max(1,Math.ceil((hi-lo)/5))){ctx.fillText('10^'+v,3,y(v)+3);ctx.beginPath();ctx.moveTo(50,y(v));ctx.lineTo(w-15,y(v));ctx.stroke();}
      ctx.setLineDash([5,5]);ctx.strokeStyle='#b77626';ctx.beginPath();ctx.moveTo(50,y(-9));ctx.lineTo(w-15,y(-9));ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle='#087b69';ctx.lineWidth=2;ctx.beginPath();logs.forEach((v,i)=>i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v)));ctx.stroke();ctx.fillStyle='#cb6438';ctx.beginPath();ctx.arc(x(k),y(logs[k]),4,0,2*Math.PI);ctx.fill();ctx.fillStyle='#647670';ctx.fillText('k=0 初始猜测',50,204);ctx.fillText('k='+String(states.length-1),w-40,204);c.onclick=e=>{pause();const rect=c.getBoundingClientRect();k=Math.max(0,Math.min(states.length-1,Math.round((e.clientX-rect.left-55)/(w-75)*(states.length-1))));drawSolver();};}
    function drawRow(states){const model=current(),candidate=states[k].values,known=model.values[n-1],frozen=states[Math.max(0,k-1)].values;
      $('row-title').textContent=`固定节点 ${tracked} · (${d.nodes[tracked].map(v=>v.toFixed(4)).join(', ')})`;
      $('row-table-wrap').hidden=d.boundary[tracked]||k===0;
      if(d.boundary[tracked]){$('row-equation').textContent='这个节点在边界上：直接规定 u=0，不作为内部自由未知量求解。';return;}
      if(k===0){$('row-equation').textContent='这是初始猜测 U⁽⁰⁾=Uⁿ。选择下一迭代，查看它如何组装并求解节点方程。';return;}
      const r=nodeEquation(d,model.nu,known,frozen,candidate,tracked,model.method);
      $('row-equation').innerHTML=math(String.raw`[M(U-U^n)/\Delta t]_i+[\nu KU]_i+[T]_i=${texNumber(r.time)}+${texNumber(r.diffusion)}+${texNumber(r.advection)}=${texNumber(r.linearResidual)}`)+`T为所选格式的输运项。${model.method==='picard'?'本轮冻结系数线性方程已求解；重新代入新场后的非线性节点残量为 '+number(r.nonlinearResidual):'本时间步只解一次线性系统；上式就是所选格式的节点残量。'}`;
      $('row-table').innerHTML=r.rows.map(e=>`<tr><td>${e.index}</td><td>${number(e.mass)}</td><td>${number(e.diffusion)}</td><td>${number(e.advection)}</td><td>${number(e.coefficient)}</td><td>${number(candidate[e.index])}</td></tr>`).join('');
      $('row-rhs').textContent=`所选格式的右端 bᵢ = ${number(r.rhs)}；表格各行对应相邻节点 j，Aᵢⱼ = Mᵢⱼ/Δt + νKᵢⱼ + 输运矩阵项（显式格式此项为0）。`;
    }
    function drawSolver(){if(!$('solver').open)return;const model=current();$('solver-empty').hidden=n!==0;$('solver-content').hidden=n===0;if(!n)return;
      const step=model.steps[n],states=step.iteration_states;k=Math.max(0,Math.min(k,states.length-1));const s=states[k];
      $('inner-step').max=states.length-1;$('inner-step').value=k;$('inner-previous').disabled=k===0;$('inner-next').disabled=k===states.length-1;
      const nonlinear=model.method==='picard';
      $('inner-label').textContent=`ν=${model.nu} · 物理步 n=${n}：t=${d.times[n-1].toFixed(2)} → ${d.times[n].toFixed(2)}；${nonlinear?'Picard更新':'求解阶段'} ${k}/${states.length-1}。`;
      $('solver-intro').textContent=nonlinear?'本步全隐式：每轮冻结当前猜测的输运系数，解线性系统，再检查完整非线性方程。':'文档显隐格式：先用已知旧场组装，再一次线性求解得到新场。本步没有非线性迭代。';
      $('stage-state').textContent=k===0?'① 已知上一时刻的场；按所选时间格式组装质量、扩散和输运项。':nonlinear?`② 冻结输运系数 → ③ 线性求解 → ④ 新场非线性残量检查。${s.relative_residual<=d.tolerance?'接受本步。':'继续更新。'}`:'② 旧场决定已知系数及右端 → ③ 一次线性求解 → ④ 线性残量达标，接受新时刻的场。';
      $('residual-title').textContent=nonlinear?'非线性残量怎样降到阈值？':'一次线性求解前后，格式残量怎样变化？';
      $('residual-note').textContent=nonlinear?'橙色虚线为10⁻⁹；线性系统解得准确，仍可能需要继续更新非线性输运系数。':'橙色虚线为10⁻⁹；横轴0为旧场代入新步方程，1为线性求解后的新场。没有额外Picard更新。';
      $('residual-value').textContent=`${nonlinear?'非线性':'线性格式'}残量 ${s.relative_residual.toExponential(3)} / 阈值 ${d.tolerance.toExponential(0)}${k?'；线性求解残量 '+s.relative_linear_residual.toExponential(3)+'；节点更新RMS '+s.update_rms.toExponential(3):''}`;
      const delta=s.values.map((v,i)=>v-model.values[n-1][i]);plane('iterate',s.values,{interactive:true});plane('increment',delta,{difference:true});residualPlot(states);drawRow(states);
    }
    function draw(){const model=current(),u=model.values[n],m=model.metrics[n],comparison=caseAt($('comparison').value);$('timeline').value=n;$('time').textContent=`n=${n}/${last} · t=${d.times[n].toFixed(2)}`;$('previous').disabled=n===0;$('next').disabled=n===last;
      $('equation').innerHTML=math(String.raw`u_t+\underbrace{u\,u_x+u\,u_y}_{\text{非线性输运}}=\underbrace{${model.nu}(u_{xx}+u_{yy})}_{\text{黏性平滑}}`);
      const formulas={imex:String.raw`(M/\Delta t+\nu K)U^{n+1}=MU^n/\Delta t-C(U^n)U^n`,reaction:String.raw`(M/\Delta t+\nu K+R(U^n))U^{n+1}=MU^n/\Delta t`,picard:String.raw`[M/\Delta t+\nu K+C(U^{(k)})]U^{(k+1)}=MU^n/\Delta t`};
      $('update').innerHTML=math(formulas[model.method]);
      $('scheme-formula').innerHTML=math(formulas[model.method]);
      const timeFormulas={imex:String.raw`\frac{u^{n+1}-u^n}{\Delta t}+u^n(\partial_xu^n+\partial_yu^n)=\nu\Delta u^{n+1}`,reaction:String.raw`\frac{u^{n+1}-u^n}{\Delta t}+u^{n+1}(\partial_xu^n+\partial_yu^n)=\nu\Delta u^{n+1}`,picard:String.raw`\frac{u^{n+1}-u^n}{\Delta t}+u^{n+1}(\partial_xu^{n+1}+\partial_yu^{n+1})=\nu\Delta u^{n+1}`};
      $('time-formula').innerHTML=math(timeFormulas[model.method]);
      $('time-levels').textContent={imex:'输运中的u和空间梯度均取旧时刻n；扩散取新时刻n+1。右端完全已知，每步解一次线性系统。',reaction:'输运中的u取新时刻n+1，梯度取旧时刻n。旧梯度成为反应型质量矩阵的系数，每步解一次线性系统。',picard:'输运和扩散均取新时刻n+1，产生非线性方程；Picard反复更新输运系数直到残量达标。'}[model.method];
      $('left-title').textContent=`① 当前ν=${model.nu}：固定平面上的值`;plane('plane',u,{interactive:true});const compare=$('right-mode').value==='compare';$('comparison-control').hidden=!compare;
      $('right-title').textContent=compare?`② 同一时刻对照：ν=${comparison.nu}`:'② 同一个解，竖起来看数值大小';
      $('right-caption').textContent=compare?'相同初值、网格、时间步和0—1色标，仅改变黏性系数。':'底面仍是x-y平面；竖直高度表示u，采用固定比例。';
      if(compare)plane('right-view',comparison.values[n]);else heightView(u);
      $('peak-value').textContent=m.peak.toFixed(4);$('energy-value').textContent=(m.energy/model.metrics[0].energy*100).toFixed(1)+'%';$('iteration-value').textContent=n?model.steps[n].linear_solves+'次线性求解':'初值';
      const peak=d.nodes[m.peak_index];$('state').textContent=`当前 ν=${model.nu}；峰位置 (${peak.map(v=>v.toFixed(3)).join(', ')})。白圈始终标记初始峰位置；黑点是你选择的固定节点。`;
      $('tracked').innerHTML=math(String.raw`(x_i,y_i)=(${d.nodes[tracked].map(v=>v.toFixed(3)).join(',')}),\quad u_i(0)=${model.values[0][tracked].toFixed(5)},\quad u_i(t)=${u[tracked].toFixed(5)}`);
      history('peak-chart','peak',false);history('energy-chart','energy',true);
      $('verification').textContent=`当前ν=${model.nu}：80个物理步全部收敛，最大${model.method==='picard'?'非线性':'线性格式'}残量 ${model.summary.residual_max.toExponential(3)}；边界误差 ${model.summary.boundary_max}；能量平衡最大缺口 ${model.summary.energy_balance_max.toExponential(3)}；最小节点值 ${model.summary.minimum.toExponential(3)}。`;
      $('energy-balance').textContent=n?`本步能量下降 ${(model.metrics[n-1].energy-m.energy).toExponential(4)} = 黏性耗散 ${model.steps[n].viscous_dissipation.toExponential(4)} + 时间离散项 ${model.steps[n].time_dissipation.toExponential(4)} + 有符号输运功 ${model.steps[n].advection_work.toExponential(4)}；平衡缺口 ${model.steps[n].energy_balance_defect.toExponential(3)}。`:'t=0只有给定初值；选择第一个物理步后，可查看能量下降的组成。';
      drawSolver();
    }
    function selectTime(value){n=Math.max(0,Math.min(last,value));k=n?current().steps[n].iteration_states.length-1:0;draw();}
    function startTime(){ $('play').textContent='暂停';timer=setInterval(()=>{selectTime(n+1);if(n===last)pause();},Number($('speed').value)); }
    $('play').onclick=()=>{if(timer){pause();return;}pause();if(n===last)selectTime(0);startTime();};
    $('speed').onchange=()=>{if(timer){clearInterval(timer);startTime();}};
    $('reset').onclick=()=>{pause();selectTime(0);};$('previous').onclick=()=>{pause();selectTime(n-1);};$('next').onclick=()=>{pause();selectTime(n+1);};$('timeline').oninput=()=>{pause();selectTime(Number($('timeline').value));};
    $('viscosity').onchange=$('scheme').onchange=()=>{pause();selectTime(n);};for(const id of ['right-mode','comparison','grid','arrows'])$(id).onchange=draw;
    $('show-solver').onclick=()=>{pause();$('solver').open=true;if(!n)selectTime(1);k=0;drawSolver();$('solver').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});};
    $('solver').ontoggle=()=>{pause();drawSolver();};$('start-solver').onclick=()=>{pause();selectTime(1);k=0;drawSolver();};
    $('inner-play').onclick=()=>{if(innerTimer){pause();return;}pause();k=0;drawSolver();$('inner-play').textContent='暂停本步求解';innerTimer=setInterval(()=>{k++;drawSolver();if(k===current().steps[n].iteration_states.length-1)pause();},900);};
    $('inner-step').oninput=()=>{pause();k=Number($('inner-step').value);drawSolver();};$('inner-previous').onclick=()=>{pause();k--;drawSolver();};$('inner-next').onclick=()=>{pause();k++;drawSolver();};
    document.querySelectorAll('[data-tex]').forEach(el=>{el.innerHTML=math(el.dataset.tex);});
    document.querySelectorAll('[data-loading]').forEach(el=>{el.disabled=false;});$('loading').hidden=true;
    window.addEventListener('resize',draw);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});draw();
  }
  boot().catch(error=>{document.getElementById('loading').textContent='数据载入失败：'+error.message;});
})();

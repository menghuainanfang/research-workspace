const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const {nodeEquation}=require('./plane_view.js');
const data=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'results_2d.json.gz'))));

test('browser element assembly reproduces all three time-scheme probe rows',()=>{
  let checked=0;
  for(const model of Object.values(data.cases))for(let n=1;n<data.times.length;n++){
    const states=model.steps[n].iteration_states;
    for(let k=1;k<states.length;k++){
      const s=states[k],probe=s.probe;
      const row=nodeEquation(data,model.nu,model.values[n-1],states[k-1].values,s.values,probe.index,model.method);
      const reference=new Map(probe.columns.map((i,j)=>[i,probe.coefficients[j]]));
      for(const e of row.rows)assert.ok(Math.abs(e.coefficient-(reference.get(e.index)||0))<2e-12,
        `nu=${model.nu}, n=${n}, k=${k}, coefficient at ${e.index}`);
      assert.ok(Math.abs(row.rhs-probe.rhs)<1e-12);
      assert.ok(Math.abs(row.linearResidual)<1e-12);
      checked++;
    }
  }
  assert.ok(checked>320);
});

test('each physical frame is its actual solve endpoint',()=>{
  for(const model of Object.values(data.cases))for(let n=1;n<data.times.length;n++){
    const step=model.steps[n],trace=step.iteration_states;
    assert.equal(step.status,'converged');
    assert.equal(trace.length,step.linear_solves+1);
    if(model.method!=='picard'){assert.equal(step.nonlinear_iterations,0);assert.equal(step.linear_solves,1);}
    assert.deepEqual(trace[0].values,model.values[n-1]);
    assert.deepEqual(trace.at(-1).values,model.values[n]);
    assert.ok(trace.at(-1).relative_residual<=data.tolerance);
    for(const row of trace)for(let i=0;i<data.nodes.length;i++)if(data.boundary[i])assert.equal(row.values[i],0);
  }
});

test('recorded energy losses close the selected scheme balance including transport work',()=>{
  for(const model of Object.values(data.cases))for(let n=1;n<data.times.length;n++){
    const step=model.steps[n],drop=model.metrics[n-1].energy-model.metrics[n].energy;
    assert.ok(drop>=-1e-12);
    assert.ok(step.viscous_dissipation>=0&&step.time_dissipation>=0);
    assert.ok(Math.abs(drop-step.viscous_dissipation-step.time_dissipation-step.advection_work)<1e-9);
  }
  for(const method of Object.keys(data.methods))assert.ok(data.cases[method+'_0.01'].metrics.at(-1).peak>data.cases[method+'_0.1'].metrics.at(-1).peak);
});

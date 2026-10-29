"""One-dimensional viscous Burgers equation with FEALPy P1 elements."""
from pathlib import Path
import json
import time
from importlib.metadata import version
import numpy as np
import scipy.sparse as sp
from scipy.sparse.linalg import spsolve
import fealpy
from fealpy.backend import backend_manager as bm
from fealpy.mesh import IntervalMesh
from fealpy.functionspace import LagrangeFESpace
from fealpy.fem import BilinearForm, ScalarMassIntegrator, ScalarDiffusionIntegrator

bm.set_backend('numpy')
ROOT = Path(__file__).resolve().parent

def exact(x, t, nu):
    a = .5 * np.exp(-nu * np.pi**2 * t)
    return 2 * nu * np.pi * a * np.sin(np.pi*x) / (1 + a*np.cos(np.pi*x))

def solve(n=160, nu=.03, dt=.002, end=1., profile='sine', frames=101):
    x = np.linspace(0., 1., n+1)
    cells = np.column_stack((np.arange(n), np.arange(1,n+1)))
    mesh = IntervalMesh(x[:, None], cells)
    space = LagrangeFESpace(mesh, p=1)
    mass, stiffness = BilinearForm(space), BilinearForm(space)
    mass.add_integrator(ScalarMassIntegrator(q=3))
    stiffness.add_integrator(ScalarDiffusionIntegrator(q=3))
    M, K = mass.assembly().to_scipy().tocsr(), stiffness.assembly().to_scipy().tocsr()
    steps = int(np.ceil(end/dt)); dt = end/steps
    A = M/dt + nu*K
    u = np.sin(np.pi*x) if profile == 'sine' else exact(x,0,nu)
    u[[0,-1]] = 0
    snapshots, times, energies = [u.tolist()], [0.], [float(u @ (M@u)/2)]
    budgets = [None]
    wanted = set(np.linspace(0,steps,frames,dtype=int))
    max_residual = 0.
    # - integral (u_h^2/2) v'_h: exact cell integration for P1.
    def convection(v):
        l,r = v[:-1],v[1:]
        flux = (l*l+l*r+r*r)/6
        c = np.zeros(n+1); c[:-1] += flux; c[1:] -= flux
        dl, dr = (2*l+r)/6, (l+2*r)/6
        jac = sp.coo_matrix((np.concatenate([dl,dr,-dl,-dr]),
              (np.concatenate([cells[:,0],cells[:,0],cells[:,1],cells[:,1]]),
               np.concatenate([cells[:,0],cells[:,1],cells[:,0],cells[:,1]]))),shape=(n+1,n+1)).tocsr()
        return c,jac
    for step in range(1, steps+1):
        previous = u.copy()
        rhs = M@u/dt
        v = u.copy()
        for iteration in range(15):
            c,jac = convection(v)
            residual = (A@v+c-rhs)[1:-1]
            if np.max(np.abs(residual)) < 1e-11:
                break
            v[1:-1] -= spsolve((A+jac)[1:-1,1:-1],residual)
        else:
            raise RuntimeError('Newton iteration did not converge')
        max_residual = max(max_residual,float(np.max(np.abs(residual))))
        u = v
        if step in wanted:
            snapshots.append(u.tolist()); times.append(step*dt); energies.append(float(u@(M@u)/2))
            c,_ = convection(u)
            advection = np.zeros(n+1); diffusion = np.zeros(n+1)
            advection[1:-1] = spsolve(M[1:-1,1:-1], -c[1:-1])
            diffusion[1:-1] = spsolve(M[1:-1,1:-1], -(nu*K@u)[1:-1])
            rate = (u-previous)/dt
            assert np.max(np.abs(rate-advection-diffusion)) < 1e-7
            budgets.append(dict(previous=previous.tolist(),rate=rate.tolist(),
                                advection=advection.tolist(),diffusion=diffusion.tolist()))
    # Gauss quadrature measures the FE function, not just nodal error.
    z,w = np.polynomial.legendre.leggauss(5)
    theta = (z+1)/2
    points = x[:-1,None] + theta[None,:]/n
    uh = u[:-1,None]*(1-theta) + u[1:,None]*theta
    ux = (u[1:]-u[:-1])*n
    ref = exact(points,end,nu)
    a=.5*np.exp(-nu*np.pi**2*end)
    refx=2*nu*np.pi**2*a*(np.cos(np.pi*points)+a)/(1+a*np.cos(np.pi*points))**2
    return dict(n=n,nu=nu,dt=dt,profile=profile,x=x.tolist(),times=times,u=snapshots,energy=energies,budgets=budgets,
                residual=max_residual,boundary=max(abs(u[0]),abs(u[-1])),
                l2=float(np.sqrt(np.sum((uh-ref)**2*w)/(2*n))) if profile=='exact' else None,
                h1=float(np.sqrt(np.sum((ux[:,None]-refx)**2*w)/(2*n))) if profile=='exact' else None)

def main():
    start=time.perf_counter()
    cases=[solve(nu=nu) for nu in [.01,.03,.1]]
    cases.append(solve(nu=.1,profile='exact'))
    convergence=[]
    for n in [20,40,80]:
        r=solve(n=n,nu=.1,dt=.2/n**2,end=.2,profile='exact',frames=2)
        convergence.append({k:r[k] for k in ['n','dt','l2','h1','residual','boundary']})
    for i,row in enumerate(convergence):
        if i:
            row['l2_order']=float(np.log2(convergence[i-1]['l2']/row['l2']))
            row['h1_order']=float(np.log2(convergence[i-1]['h1']/row['h1']))
    for case in cases:
        assert case['boundary'] == 0 and case['residual'] < 1e-10
        assert np.max(np.diff(case['energy'])) < 1e-10, 'Energy must dissipate'
    assert convergence[-1]['l2_order'] > 1.8 and convergence[-1]['h1_order'] > .9
    data=dict(cases=cases,convergence=convergence,fealpy=version('fealpy'),source=fealpy.__file__,seconds=time.perf_counter()-start)
    (ROOT/'results.json').write_text(json.dumps(data,ensure_ascii=False),encoding='utf-8')
    template=(ROOT/'template.html').read_text(encoding='utf-8')
    renderer=(ROOT/'../../移动网格/tools/vendor/katex.min.js').resolve().read_text(encoding='utf-8')
    (ROOT/'index.html').write_text(template.replace('__DATA__',json.dumps(data,ensure_ascii=False)).replace('__KATEX__',renderer),encoding='utf-8')
    print(json.dumps({k:v for k,v in data.items() if k!='cases'},ensure_ascii=False,indent=2))
if __name__=='__main__':
    main()


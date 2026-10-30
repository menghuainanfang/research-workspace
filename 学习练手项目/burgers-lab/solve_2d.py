"""Unforced two-dimensional scalar Burgers on a fixed P1 mesh."""
from pathlib import Path
import sys
import json
import numpy as np
from fealpy.backend import backend_manager as bm
from fealpy.mesh import TriangleMesh

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[1] / '移动网格'))
from src.burgers_rezone import solve_step


class Pulse:
    nu = .02
    has_exact_solution = False

    def fields(self, p, t):
        # Only the homogeneous boundary and zero source are prescribed at t>0.
        return np.zeros(p.shape[:-1]), np.zeros_like(p), np.zeros(p.shape[:-1])


def main():
    bm.set_backend('numpy')
    mesh = TriangleMesh.from_box(nx=32, ny=32)
    nodes, cells = np.array(mesh.node), np.array(mesh.cell)
    boundary = np.array(mesh.boundary_node_flag())
    x,y=nodes.T
    u=np.exp(-((x-.28)**2+(y-.28)**2)/.018)*np.sin(np.pi*x)*np.sin(np.pi*y)
    u/=u.max();u[boundary]=0
    frames=[u.tolist()];residuals=[]
    for k in range(1,81):
        u,stats=solve_step(nodes,cells,u,k*.01,.01,data=Pulse())
        assert stats['status']=='converged' and stats['boundary_error']<1e-12
        residuals.append(stats['relative_nonlinear_residual']);frames.append(u.tolist())
    data=dict(nodes=nodes.tolist(),cells=cells.tolist(),times=(np.arange(81)*.01).tolist(),values=frames,nu=.02,dt=.01,
              residual_max=max(residuals),boundary_max=float(np.abs(np.array(frames)[:,boundary]).max()),
              model='u_t+u(u_x+u_y)=nu*Delta(u); zero source and boundary; fixed P1 mesh',exact_solution=None)
    (ROOT/'results_2d.json').write_text(json.dumps(data),encoding='utf-8')
    template=(ROOT/'plane_template.html').read_text(encoding='utf-8')
    renderer=(ROOT/'../../移动网格/tools/vendor/katex.min.js').resolve().read_text(encoding='utf-8')
    (ROOT/'plane.html').write_text(template.replace('__DATA__',json.dumps(data)).replace('__KATEX__',renderer),encoding='utf-8')
    print('2D steps=80; nodes=1089; max residual=',max(residuals))


if __name__=='__main__':main()

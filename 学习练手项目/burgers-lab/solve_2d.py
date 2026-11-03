"""Unforced 2D Burgers: fixed-mesh P1 discretization and three time schemes."""
import argparse
import base64
import gzip
import json
from pathlib import Path
import sys
from time import perf_counter
import numpy as np
from fealpy.backend import backend_manager as bm
from fealpy.mesh import TriangleMesh
from fealpy.functionspace import LagrangeFESpace
from fealpy.fem import BilinearForm, ScalarMassIntegrator, ScalarDiffusionIntegrator

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parents[1]/"移动网格"
sys.path.insert(0, str(PROJECT))
from schemes_2d import TimeStepper
from src.geometry import signed_triangle_areas
VISCOSITIES = (.01, .02, .05, .1)
METHODS = {'imex': '文档主程序：显式输运 / 隐式扩散',
           'reaction': '文档方案二：新值乘旧梯度', 'picard': '全隐式：Picard迭代'}

def matrices(mesh):
    space = LagrangeFESpace(mesh, p=1)
    result = []
    for integrator in (ScalarMassIntegrator(q=4), ScalarDiffusionIntegrator(q=4, method=None)):
        form = BilinearForm(space)
        form.add_integrator(integrator)
        result.append(form.assembly().to_scipy())
    return result

def render(data):
    packed = base64.b64encode(gzip.compress(json.dumps(data, separators=(",", ":"), allow_nan=False)
                                          .encode("utf-8"), compresslevel=6)).decode("ascii")
    template = (ROOT/"plane_template.html").read_text(encoding="utf-8")
    renderer = (PROJECT/"tools/vendor/katex.min.js").read_text(encoding="utf-8")
    script = (ROOT/"plane_view.js").read_text(encoding="utf-8")
    (ROOT/"plane.html").write_text(template.replace("__DATA__", json.dumps(packed))
        .replace("__KATEX__", renderer).replace("__SCRIPT__", script), encoding="utf-8")

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--render-only", action="store_true")
    args = parser.parse_args()
    if args.render_only:
        render(json.loads(gzip.decompress((ROOT/"results_2d.json.gz").read_bytes())))
        return
    bm.set_backend("numpy")
    mesh = TriangleMesh.from_box(nx=32, ny=32)
    nodes, cells = np.array(mesh.node), np.array(mesh.cell)
    boundary = np.array(mesh.boundary_node_flag())
    mass, stiffness = matrices(mesh)
    triangles = nodes[cells]
    edge = triangles[:, 1:]-triangles[:, :1]
    gradients = np.zeros((len(cells), 3, 2))
    gradients[:, 1:] = np.linalg.inv(edge).swapaxes(-1, -2)
    gradients[:, 0] = -gradients[:, 1:].sum(axis=1)
    x, y = nodes.T
    initial = np.exp(-((x-.28)**2+(y-.28)**2)/.018)*np.sin(np.pi*x)*np.sin(np.pi*y)
    initial /= initial.max()
    initial[boundary] = 0.
    dt, count = .01, 80
    stepper = TimeStepper(nodes, cells, boundary, mass, stiffness, gradients, signed_triangle_areas(nodes, cells))
    data = dict(schema_version="burgers-plane-schemes-v3", methods=METHODS, viscosities=VISCOSITIES, nodes=nodes.tolist(), cells=cells.tolist(),
                boundary=boundary.tolist(), gradients=gradients.tolist(),
                areas=signed_triangle_areas(nodes, cells).tolist(),
                times=(np.arange(count+1)*dt).tolist(), dt=dt, tolerance=1e-9, n=32,
                model="u_t+u(u_x+u_y)=nu*Delta(u); zero source and boundary; fixed P1 mesh",
                exact_solution=None, cases={})
    summaries = []
    for method, nu in ((method, nu) for method in METHODS for nu in VISCOSITIES):
        start = perf_counter()
        u = initial.copy()
        frames, steps, metrics = [u.tolist()], [None], []
        def measure(values):
            weighted = mass@values
            amount = float(weighted.sum())
            peak = int(np.argmax(values))
            return dict(peak=float(values[peak]), minimum=float(values.min()), peak_index=peak,
                        energy=float(.5*values@weighted), integral=amount,
                        center=(nodes.T@weighted/amount).tolist())
        metrics.append(measure(u))
        for k in range(1, count+1):
            old = u.copy()
            u, stats = stepper.step(old, nu, dt, method)
            if stats["status"]!="converged" or stats["boundary_error"]>1e-12:
                raise RuntimeError(f"nu={nu}, step={k}: {stats['status']}")
            current = measure(u)
            change = u-old
            stats.update(viscous_dissipation=float(dt*nu*(u@(stiffness@u))),
                         time_dissipation=float(.5*change@(mass@change)))
            stats["energy_balance_defect"] = (current["energy"]-metrics[-1]["energy"]
                +stats["viscous_dissipation"]+stats["time_dissipation"]+stats['advection_work'])
            frames.append(u.tolist());steps.append(stats);metrics.append(current)
        summary = dict(method=method, nu=nu, steps=count, residual_max=max(s["relative_residual"] for s in steps[1:]),
                       boundary_max=max(s["boundary_error"] for s in steps[1:]),
                       energy_balance_max=max(abs(s["energy_balance_defect"]) for s in steps[1:]),
                       picard_max=max(s["nonlinear_iterations"] for s in steps[1:]),
                       minimum=min(m["minimum"] for m in metrics), final_peak=metrics[-1]["peak"],
                       final_energy=metrics[-1]["energy"], wall_seconds=perf_counter()-start)
        data["cases"][method+'_'+str(nu)] = dict(method=method, nu=nu, values=frames, steps=steps, metrics=metrics, summary=summary)
        summaries.append(summary)
        print(json.dumps(summary), flush=True)
    (ROOT/"results_2d.json.gz").write_bytes(gzip.compress(json.dumps(data, allow_nan=False).encode("utf-8"), compresslevel=6))
    (ROOT/"validation_2d.json").write_text(json.dumps(dict(nodes=len(nodes), cells=len(cells), cases=summaries), indent=2), encoding="utf-8")
    render(data)
    (ROOT/"results_2d.json").unlink(missing_ok=True)

if __name__=="__main__":main()

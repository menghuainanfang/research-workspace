"""Verify P1 transport assembly and temporal accuracy on a fixed mesh."""
import unittest
import numpy as np
from scipy.integrate import solve_ivp
from scipy.sparse.linalg import factorized
from fealpy.decorator import barycentric
from fealpy.fem import BilinearForm, ScalarConvectionIntegrator, ScalarMassIntegrator
from fealpy.functionspace import LagrangeFESpace
from solve_2d import matrices, TriangleMesh, signed_triangle_areas, bm
from schemes_2d import TimeStepper


class SchemesTest(unittest.TestCase):
    def setUp(self):
        bm.set_backend('numpy')
        self.mesh = TriangleMesh.from_box(nx=8, ny=8)
        nodes, cells = np.array(self.mesh.node), np.array(self.mesh.cell)
        gradients = np.zeros((len(cells), 3, 2))
        gradients[:, 1:] = np.linalg.inv(nodes[cells][:, 1:]-nodes[cells][:, :1]).swapaxes(-1, -2)
        gradients[:, 0] = -gradients[:, 1:].sum(axis=1)
        mass, stiffness = matrices(self.mesh)
        self.s = TimeStepper(nodes, cells, np.array(self.mesh.boundary_node_flag()), mass, stiffness,
                             gradients, signed_triangle_areas(nodes, cells))
        x,y = nodes.T
        self.initial = np.sin(np.pi*x)*np.sin(np.pi*y)
        self.initial[self.s.boundary] = 0

    def test_transport_matches_fealpy(self):
        space = LagrangeFESpace(self.mesh, p=1)
        uh = space.function(self.initial)
        @barycentric
        def velocity(bcs, index):
            v = uh(bcs,index)
            return np.stack((v,v),axis=-1)
        @barycentric
        def slope(bcs,index):
            return uh.grad_value(bcs,index).sum(axis=-1)
        for reaction, integrator in [(False,ScalarConvectionIntegrator(velocity,q=4)),
                                     (True,ScalarMassIntegrator(slope,q=4))]:
            form = BilinearForm(space);form.add_integrator(integrator)
            np.testing.assert_allclose(self.s.transport(self.initial,reaction).toarray(),
                                       form.assembly().to_scipy().toarray(),atol=2e-15)

    def test_first_order_time_accuracy(self):
        s,nu = self.s,.02
        inverse = factorized(s.mass[s.free][:,s.free].tocsc())
        def rhs(t, free):
            u = np.zeros(len(s.nodes));u[s.free] = free
            return inverse(-(nu*s.stiffness@u+s.transport(u)@u)[s.free])
        reference = solve_ivp(rhs,(0,.1),self.initial[s.free],rtol=1e-11,atol=1e-13,method='DOP853')
        self.assertTrue(reference.success)
        for method in ('imex','reaction','picard'):
            errors=[]
            for dt in (.01,.005,.0025):
                u=self.initial.copy()
                for _ in range(round(.1/dt)):
                    u,stats=s.step(u,nu,dt,method,tolerance=1e-12)
                    self.assertEqual(stats['status'],'converged')
                errors.append(float(np.linalg.norm(u[s.free]-reference.y[:,-1])))
            print(method,'temporal errors',errors,flush=True)
            self.assertTrue(1.7<errors[0]/errors[1]<2.3)
            self.assertTrue(1.7<errors[1]/errors[2]<2.3)


if __name__=='__main__':unittest.main()

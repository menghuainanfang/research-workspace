"""P1 time schemes for scalar Burgers on a fixed zero-boundary mesh."""
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.linalg import spsolve


class TimeStepper:
    def __init__(self, nodes, cells, boundary, mass, stiffness, gradients, areas):
        self.nodes, self.cells, self.boundary = nodes, cells, boundary
        self.mass, self.stiffness = mass, stiffness
        self.gradients, self.areas = gradients, areas
        self.free = np.flatnonzero(~boundary)
        self.rows = np.broadcast_to(cells[:, :, None], (len(cells), 3, 3)).ravel()
        self.cols = np.broadcast_to(cells[:, None, :], (len(cells), 3, 3)).ravel()
        self.local_mass = areas[:, None, None] * (np.ones((3, 3)) + np.eye(3))/12
        self.probe = int(np.argmin(np.linalg.norm(nodes-.5, axis=1)))

    def transport(self, values, reaction=False):
        if reaction:
            slope = np.einsum('ti,tid->td', values[self.cells], self.gradients).sum(axis=1)
            local = self.local_mass*slope[:, None, None]
        else:
            weight = np.einsum('tij,tj->ti', self.local_mass, values[self.cells])
            local = weight[:, :, None]*self.gradients.sum(axis=2)[:, None, :]
        return coo_matrix((local.ravel(), (self.rows, self.cols)), shape=self.mass.shape).tocsr()

    def step(self, old, nu, dt, method, tolerance=1e-9):
        base = self.mass/dt+nu*self.stiffness
        rhs = self.mass@old/dt
        old_transport = self.transport(old, reaction=method=='reaction')
        if method=='imex':
            rhs -= old_transport@old
        def operator(values):
            if method=='imex': return base
            return base+(old_transport if method=='reaction' else self.transport(values))
        scale = max(np.linalg.norm(rhs[self.free]), 1.)
        def residual(values):
            return float(np.linalg.norm((operator(values)@values-rhs)[self.free])/scale)
        u = old.copy()
        states = [dict(index=0, values=u.tolist(), relative_residual=residual(u),
                       relative_linear_residual=None, update_rms=None)]
        for k in range(1, 31 if method=='picard' else 2):
            a = operator(u)
            new = np.zeros_like(u)
            new[self.free] = spsolve(a[self.free][:, self.free], rhs[self.free])
            row = a.getrow(self.probe)
            states.append(dict(index=k, values=new.tolist(), relative_residual=residual(new),
                relative_linear_residual=float(np.linalg.norm((a@new-rhs)[self.free])/scale),
                update_rms=float(np.sqrt(np.mean((new-u)**2))),
                probe=dict(index=self.probe, columns=row.indices.tolist(), coefficients=row.data.tolist(), rhs=float(rhs[self.probe]))))
            u = new
            if states[-1]['relative_residual']<=tolerance: break
        transport = self.transport(u)@u if method=='picard' else old_transport@(old if method=='imex' else u)
        return u, dict(status='converged' if residual(u)<=tolerance else 'failed',
            nonlinear_iterations=k if method=='picard' else 0, linear_solves=k,
            relative_residual=residual(u), residual_kind='nonlinear' if method=='picard' else 'linear',
            boundary_error=float(np.max(np.abs(u[self.boundary]))), iteration_states=states,
            advection_work=float(dt*u@transport))

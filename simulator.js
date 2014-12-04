/* File: simulator.js
 * The Simulator object maintains the Grid object and all of the
 * simulation values, as well as the main algorithm steps.
 */


N_SOLVER_ITERS = 20;

BOUNDARY_MIRROR = 0;
BOUNDARY_OPPOSE_X = 1;
BOUNDARY_OPPOSE_Y = 2;


/* The Simulator object provides an API for running the simulation using
 * the resources made available by the Grid data structure.
 * Parameters:
 *      N - the size of the grid (N by N practical grid).
 *      width - the width of the grid region.
 *      height - the height of the grid region.
 *      visc - the viscocity constant.
 *      diff - the diffusion constant.
 *      timeStep - the time step.
 */
function Simulator(N, width, height, visc, diff, timeStep) {
    this.diff = diff;
    this.visc = visc;
    this.timeStep = timeStep;

    // initialize the grid structure
    this.grid = new Grid([N, N, 1], [width, height, 0]);

    // To each element of array dest adds the respective element of the
    // source (also an array) multiplied by the time step.
    // Use to add source arrays for velocity and density.
    this.addSource = function(dest, source) {
        for(var i=0; i<this.grid.N[X_DIM]+2; i++)
            for(var j=0; j<this.grid.N[Y_DIM]+2; j++)
                for(var k=0; k<this.grid.N[Z_DIM]+2; k++)
                    dest[i][j][k] += this.timeStep * source[i][j][k];
    }

    // Sets the values of vector cur to the "diffused" values.
    // That is, the values of cur "leak in" to and "leak out" of all
    // neighboring cells.
    // k is the diffusion constant (diff or visc, depending)
    // bMode is the boundary mode for setBoundary().
    this.diffuse = function(cur, prev, k, bMode) {
        var a = this.timeStep * k * this.grid.N[X_DIM] * this.grid.N[Y_DIM];
        for(var iter=0; iter<N_SOLVER_ITERS; iter++) {
            for(var i=1; i<=this.grid.N[X_DIM]; i++) {
                for(var j=1; j<=this.grid.N[Y_DIM]; j++) {
                    cur[i][j][1] = (prev[i][j][1]
                                    + a*(cur[i-1][j][1] + cur[i+1][j][1] +
                                      cur[i][j-1][1] + cur[i][j+1][1])
                              ) / (1 + 4*a);
                }
            }
            this.setBoundary(cur, bMode);
        }
    }

    // Sets the fields in cur to be the values of prev flowing in the
    // direction given by velocity vel (a multi-dimensional velocity field).
    // bMode is the boundary mode for setBoundary().
    this.advect = function(cur, prev, vel, bMode) {
        var dX = this.grid.N[X_DIM];// * this.timeStep; // TODO!
        var dY = this.grid.N[Y_DIM];// * this.timeStep; // TODO!
        for(var i=1; i<=this.grid.N[X_DIM]; i++) {
            for(var j=1; j<=this.grid.N[Y_DIM]; j++) {
                // get resulting x coordinate cell after backtracking by vel
                var x = i - dX * vel[X_DIM][i][j][1];
                if(x < 0.5)
                    x = 0.5;
                if(x > this.grid.N[X_DIM] + 0.5)
                    x = this.grid.N[X_DIM] + 0.5;
                var i0 = Math.floor(x);
                var i1 = i0 + 1;
                // get resulting y coodinate cell after backtracking by vel
                var y = j - dY * vel[Y_DIM][i][j][1];
                if(y < 0.5)
                    y = 0.5;
                if(y > this.grid.N[Y_DIM] + 0.5)
                    y = this.grid.N[Y_DIM] + 0.5;
                var j0 = Math.floor(y);
                var j1 = j0 + 1;
                // bilinear interopolation:
                var s1 = x - i0;
                var s0 = 1 - s1;
                var t1 = y - j0;
                var t0 = 1 - t1;
                cur[i][j][1] = s0*(t0*prev[i0][j0][1] + t1*prev[i0][j1][1]) +
                               s1*(t0*prev[i1][j0][1] + t1*prev[i1][j1][1]);
            }
        }
        this.setBoundary(cur, bMode);
    }

    // Project step forces velocities to be mass-conserving.
    this.project = function(vel, buf) {
        var Lx = 1.0 / this.grid.N[X_DIM];
        var Ly = 1.0 / this.grid.N[Y_DIM];
        var p = buf[X_DIM];
        var div = buf[Y_DIM];
        
        for(var i=1; i<=this.grid.N[X_DIM]; i++) {
            for(var j=1; j<=this.grid.N[Y_DIM]; j++) {
                div[i][j][1] = -0.5*(Lx*(vel[X_DIM][i+1][j][1] - vel[X_DIM][i-1][j][1]) +
                                     Ly*(vel[Y_DIM][i][j+1][1] - vel[Y_DIM][i][j-1][1]));
                p[i][j][1] = 0;
            }
        }
        this.setBoundary(div);
        this.setBoundary(p);

        for(var iter=0; iter<N_SOLVER_ITERS; iter++) {
            for(var i=1; i<=this.grid.N[X_DIM]; i++) {
                for(var j=1; j<=this.grid.N[Y_DIM]; j++) {
                    p[i][j][1] = (div[i][j][1]
                                  + p[i-1][j][1] + p[i+1][j][1]
                                  + p[i][j-1][1] + p[i][j+1][1]
                                 ) / 4;
                }
            }
            this.setBoundary(p);
        }

        for(var i=1; i<=this.grid.N[X_DIM]; i++) {
            for(var j=1; j<=this.grid.N[Y_DIM]; j++) {
                vel[X_DIM][i][j][1] -= 0.5*(p[i+1][j][1] - p[i-1][j][1]) / Lx;
                vel[Y_DIM][i][j][1] -= 0.5*(p[i][j+1][1] - p[i][j-1][1]) / Ly;
            }
        }
        this.setBoundary(vel[X_DIM], BOUNDARY_OPPOSE_X);
        this.setBoundary(vel[Y_DIM], BOUNDARY_OPPOSE_Y);
    }

    // Sets the values of X on the boundary cells (inactive in the actual
    // simulation visualization) to the appropriate values based on mode.
    // mode:
    //  BOUNDARY_MIRROR   => all border values will be copied from the
    //      closest inner neighboring cell.
    //  BOUNDARY_OPPOSE_X => the left and right edges will have inverse
    //      values of the closest inner neighors.
    //  BOUNDARY_OPPOSE_Y => the top and bottom edges will have inverse
    //      values of the closest inner neighbors.
    this.setBoundary = function(X, mode = BOUNDARY_MIRROR) {
        // index 1 and "last" are the endpoints of the active grid
        var lastX = this.grid.N[X_DIM];
        var lastY = this.grid.N[Y_DIM];
        // index 0 and "edge" are the border cells we're updating
        var edgeX = lastX + 1;
        var edgeY = lastY + 1;
        // update left and right edges
        for(var j=1; j<=lastY; j++) {
            if(mode == BOUNDARY_OPPOSE_X) {
                X[0][j][1] = -X[1][j][1];
                X[edgeX][j][1] = -X[lastX][j][1];
            }
            else {
                X[0][j][1] = X[1][j][1];
                X[edgeX][j][1] = X[lastX][j][1];
            }
        }
        // update top and bottom edges
        for(var i=1; i<=lastX; i++) {
            if(mode == BOUNDARY_OPPOSE_Y) {
                X[i][0][1] = -X[i][1][1];
                X[i][edgeY][1] = -X[i][lastY][1];
            }
            else {
                X[i][0][1] = X[i][1][1];
                X[i][edgeY][1] = X[i][lastY][1];
            }
        }
        // update corners to be averages of their nearest edge neighbors
        X[0][0][1]         = 0.5*(X[1][0][1] + X[0][1][1]);
        X[0][edgeY][1]     = 0.5*(X[1][edgeY][1] + X[0][lastY][1]);
        X[edgeX][0][1]     = 0.5*(X[lastX][0][1] + X[edgeX][1][1]);
        X[edgeX][edgeY][1] = 0.5*(X[lastX][edgeY][1] + X[edgeX][lastY][1]);
    }

    // Does one velocity field update.
    this.vStep = function() {
        for(var dim=0; dim<N_DIMS; dim++) {
            this.addSource(this.grid.vel[dim], this.grid.prev_vel[dim]);
            this.addSource(this.grid.vel[dim], this.v_src[dim]);
        }
        this.grid.swapV();

        for(var dim=0; dim<N_DIMS; dim++)
            this.diffuse(this.grid.vel[dim], this.grid.prev_vel[dim],
                         this.visc, dim+1); // TODO - boundary dim
        this.project(this.grid.vel, this.grid.prev_vel);
        this.grid.swapV();
        for(var dim=0; dim<N_DIMS; dim++)
            this.advect(this.grid.vel[dim], this.grid.prev_vel[dim],
                        this.grid.vel, dim+1); // TODO - boundary dim
        this.project(this.grid.vel, this.grid.prev_vel);
    }

    // Does one scalar field update.
    this.dStep = function() {
        this.addSource(this.grid.dens, this.grid.prev_dens);
        this.grid.swapD();
        this.diffuse(this.grid.dens, this.grid.prev_dens,
                     this.diff, BOUNDARY_MIRROR);
        this.grid.swapD();
        this.advect(this.grid.dens, this.grid.prev_dens,
                    this.grid.vel, BOUNDARY_MIRROR);
        
    }

    // Take one step in the simulation.
    this.v_src = zeros4d(3, this.grid.N[X_DIM]+2, this.grid.N[Y_DIM]+2,
                            this.grid.N[Z_DIM]+2);
    this.v_src[X_DIM][5][25][1] = 500;
    this.step = function(ctx) {
        this.grid.clearPrev();
        this.vStep();
        this.dStep();
        this.grid.render(ctx, false, true);
    }

    // When the user clicks, interface with the stuff.
    this.registerClick = function(x, y) {
        this.grid.registerClick(x, y);
    }
}

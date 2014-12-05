/* File: ui.js
 * Provides a method to track user interaction with the simulation and
 * an interface to query the GUI at any time.
 */


// GUI constants
ACT_DENSITY_DRAG = 0;
ACT_DENSITY_SRC = 1;
ACT_VELOCITY_SRC = 2;


// UI Class: interfaces with the GUI.
function UI(canvas_id) {
    this.canvas = document.getElementById(canvas_id);
    this.ctx = this.canvas.getContext("2d");
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.mouse_dragging = false;
    
    // Getters:
    this.getContext = function() {
        return this.ctx;
    }

    // UI constants (call defaults() to change to default).
    this.defaults = function() {
        this.visc = 0.1;
        this.diff = 0.1;
        this.dT = 0.01;
        this.grid_div = 50;
        this.show_grid = false;
        this.show_vels = false;
        this.vel_x = 500;
        this.vel_y = 0;
    }
    this.defaults();

    // Sets the GUI parameters from internal values.
    this.setUI = function() {
        document.getElementById("show_grid").checked = this.show_grid;
        document.getElementById("show_vels").checked = this.show_vels;
        document.getElementById("visc_val").value = this.visc;
        document.getElementById("diff_val").value = this.diff;
        document.getElementById("vel_x").value = this.vel_x;
        document.getElementById("vel_y").value = this.vel_y;
        document.getElementById("grid_size").value = this.grid_div;

        //document.getElementById("action_dens_drag").checked = true;
        //document.getElementById("action_dens_src").checked = false;
        //document.getElementById("action_vel_src").checked = false;
        //document.getElementById("keep_prev").checked = false;
    }
    this.setUI();

    // Reads simulation parameters from the GUI.
    this.readUI = function() {
        this.show_grid = document.getElementById("show_grid").checked;
        this.show_vels = document.getElementById("show_vels").checked;
        this.visc = parseFloat(document.getElementById("visc_val").value);
        this.diff = parseFloat(document.getElementById("diff_val").value);
        this.vel_x = parseFloat(document.getElementById("vel_x").value);
        this.vel_y = parseFloat(document.getElementById("vel_y").value);
        this.grid_div = parseInt(document.getElementById("grid_size").value);
        /*action = ACT_DENSITY_DRAG;
        if(document.getElementById("action_dens_src").checked)
            action = ACT_DENSITY_SRC;
        else if(document.getElementById("action_vel_src").checked)
            action = ACT_VELOCITY_SRC;*/
        //keep_prev = document.getElementById("keep_prev").checked;
    }

    // Set up listeners for mouse events.
    this.canvas.onmousedown = function(event) {
        ui.mousedown(event);
    }
    document.onmouseup = function(event) {
        ui.mouseup(event);
    }
    this.canvas.onmousemove = function(event) {
        ui.mousemove(event);
    }

    // Returns the x, y position on the canvas given the JavaScript event
    // containing an absolute window position.
    this.getPositionOnCanvas = function(event) {
        var x = Math.floor(event.pageX - $(this.canvas).position().left);
        var y = Math.floor(event.pageY - $(this.canvas).position().top);
        return {x:x, y:y};
    }

    // When the user clicks down the mouse, dragging starts.
    this.mousedown = function(event) {
        this.mouse_dragging = true;
        this.mousemove(event);
    }

    // When the user lifts the mouse, dragging ends.
    this.mouseup = function(event) {
        this.mouse_dragging = false;
    }

    // When the mouse moves, apply the appropriate source.
    this.mousemove = function(event) {
        if(!this.mouse_dragging)
            return;
        this.source = this.getPositionOnCanvas(event);
    }

    // Returns the source.
    this.getSource = function() {
        if(this.mouse_dragging)
            return this.source;
        else
            return null;
    }
    // Fills in the velocity array v and density array d with the
    // appropriate values based on the current user interaction.
    this.query = function(v, d) {
        ;
    }
}
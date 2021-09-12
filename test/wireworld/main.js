class Grid {
  constructor(w, h, size) {
    this.w = w;
    this.h = h;
    this.size = size;
    this.data = [];
    this.data2 = [];
    this.default = -1;
    this.time = 0;
    for (let j = 0; j < this.h; j++) {
      for (let i = 0; i < this.w; i++) {
        this.data.push(0);
        this.data.push(0);
      }
    }
  }
  set_default(v) {
    this.default = v;
  }
  get_index(x, y) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) {
      return -1;
    }
    return x + y * this.w;
  }
  get(x, y) {
    const i = this.get_index(x, y);
    return i < 0 ? this.default : this.data[i];
  }
  set(x, y, v) {
    const i = this.get_index(x, y);
    if (i > 0) {
      this.data[i] = v;
    }
  }
  render_loop(callback) {
    for (let j = 0; j < this.h; j++) {
      for (let i = 0; i < this.w; i++) {
        const idx = this.get_index(i, j);
        callback(this.data[idx], i, j, this.size);
      }
    }
  }

  update_loop(callback) {
    for (let j = 0; j < this.h; j++) {
      for (let i = 0; i < this.w; i++) {
        const idx = this.get_index(i, j);
        let n = 0;
        n += (this.get(i + 1, j) == 2);
        n += (this.get(i - 1, j) == 2);
        n += (this.get(i, j + 1) == 2);
        n += (this.get(i, j - 1) == 2);
        n += (this.get(i + 1, j + 1) == 2);
        n += (this.get(i - 1, j - 1) == 2);
        n += (this.get(i - 1, j + 1) == 2);
        n += (this.get(i + 1, j - 1) == 2);
        this.data2[idx] = callback(this.data[idx],n);
      }
    }
  }

  swap(){
    let tmp = this.data;
    this.data = this.data2;
    this.data2 = tmp;
  }
}

function Rule(a,n){
  switch(a)
  {
    case 0:
      return 0;
    case 1:
      {
        switch(n)
        {
          case 1:
          case 2:
            return 2;
        }
        return 1;
      };
    case 2:
      return 3;
    case 3:
      return 1;
  }
  return 0;
}

function color_map(v){
  switch(v){
    case 1:
      return "orange";
    case 2:
      return "blue";
    case 3:
      return "red";
  }
  return "lightgray";
}

class Test {
  constructor() {
    this.canvas = document.createElement("canvas");
    this.container = document.createElement("div");
    this.ctx = this.canvas.getContext("2d");
    this.brush = 1;
    this.dt = 100;
    this.w = 800;
    this.h = 600;
    this.stop = false;
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.canvas.style = "border:1.2px solid gray;";
    this.grid = new Grid(800 / 10, 600 / 10, 10);
    this.container.appendChild(this.canvas);
  }

  get_canvas() {
    //return this.canvas;
    return this.container;
  }
  
  draw_cell(x, y, size, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.lineWidth = 0.1;
    ctx.strokeStyle = "black";
    ctx.fillRect(x, y, size, size);
    ctx.strokeRect(x, y, size, size);
  }
  draw() {
    this.ctx.clearRect(0, 0, this.w, this.h);
    this.grid.render_loop((v, i, j, size) => {
      const color = color_map(v);
      this.draw_cell(i*size, j*size, size, color);
    });
    this.ctx.fillStyle = "black";
    this.ctx.strokeStyle = "black";
  }

  handle_input() {
    const plot = (x, y, v) => this.grid.set(x, y, v);
    //bresenham's line算法, https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm
    const plot_line = (x0, y0, x1, y1, c) => {
      const dx = Math.abs(x1 - x0);
      const dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1;
      const sy = y0 < y1 ? 1 : -1;
      let err = dx + dy; /* error value e_xy */
      while (true) {
        plot(x0, y0, c);
        if (x0 == x1 && y0 == y1) break;
        const e2 = 2 * err;
        /* e_xy+e_x > 0 */
        if (e2 >= dy) {
          err += dy;
          x0 += sx;
        }
        /* e_xy+e_y < 0 */
        if (e2 <= dx) {
          err += dx;
          y0 += sy;
        }
      }
    };

    let last = null;
    this.canvas.oncontextmenu = (e) => e.preventDefault();
    this.canvas.onmousedown = (e) => {
      const lbtndown = e.buttons & 1;
      const rbtndown = e.buttons & 2;
      if (e.buttons < 1) return;
      const y = Math.floor(e.offsetY / this.grid.size);
      const x = Math.floor(e.offsetX / this.grid.size);
      if (lbtndown) {
        const b = (this.grid.get(x, y) + 1) % 4;
        plot(x, y, b);
      }
      if (rbtndown) {
        plot(x, y, 0);
      } 
    };
    this.canvas.onmouseup = (e) => {
      last = null;
    };
    this.canvas.onmousemove = (e) => {
      const lbtndown = e.buttons & 1;
      const rbtndown = e.buttons & 2;
      //const mbtndown = e.buttons&4;
      if (e.buttons < 1) return;
      const y = Math.floor(e.offsetY / this.grid.size);
      const x = Math.floor(e.offsetX / this.grid.size);
      if (lbtndown) {
        last = last || [x, y];
        plot_line(...last, x, y, this.brush);
        last = [x, y];
      }
      if (rbtndown) {
        last = last || [x, y];
        plot_line(...last, x, y, 0);
        last = [x, y];
      }
    };
    window.onkeydown = (e) => {
      switch (e.key) {
        case " ":
          this.stop = !this.stop;
          break;

        default:
          break;
      }
    };
  }

  run() {
    let previous = new Date().getTime();
    let lag = 0.0;
    const gameloop = () => {
      const current = new Date().getTime();
      const elapsed = current - previous;
      previous = current;
      lag += elapsed;
      if (lag < this.dt * 5) {
        while (lag >= this.dt) {
          lag -= this.dt;
          if (this.stop) continue;
          this.update();
        }
        this.draw();
      } else {
        console.log("计算超时");
        lag = 0;
      }

      requestAnimationFrame(gameloop);
    };
    this.handle_input();
    gameloop();
  }

  update() {
    this.grid.update_loop(Rule);
    this.grid.swap();
  }
}

function main() {
  const test = new Test();
  document.body.appendChild(test.get_canvas());
  document.body.style = "text-align:center;margin:32px";
  test.run();
}

document.body.onload = main;

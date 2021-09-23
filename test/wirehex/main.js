//尝试六边形网格的wireworld自动机，需要更多的周期
class HexGrid {
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
  energy_map(state){
    switch (state) {
      case 2:
        return 1;
      case 16:
        return 2;
      case 64:
        return 0.1;
      default:
        break;
    }
    return 0;
  }
  update_loop(callback) {
    for (let j = 0; j < this.h; j++) {
      for (let i = 0; i < this.w; i++) {
        const idx = this.get_index(i, j);
        let n = 0;
        let _0,_1,_2,_3,_4,_5;
        const d = (j&1)?-1:1;
        n += _0 = this.energy_map(this.get(i + 1, j));
        n += _1 = this.energy_map(this.get(i - 1, j));
        n += _2 = this.energy_map(this.get(i, j + 1));
        n += _3 = this.energy_map(this.get(i, j - 1));
        n += _4 = this.energy_map(this.get(i - d, j + 1));
        n += _5 = this.energy_map(this.get(i - d, j - 1));
        let flag = false;
        // if(n===2){
        //   // if(d===1&&(_0&&_5||_0&&_4||_4&&_5||_1&&_2||_1&&_3||_2&&_3 )){
        //   //   flag = true;
        //   // }
        //   // if(d===-1&&(_3&&_0||_3&&_2||_0&&_2||_5&&_1||_5&&_4||_1&&_4)){
        //   //   flag = true;
        //   // }
        //   if(d===1&&(_3&&_0||_0&&_2||_2&&_4||_4&&_1||_1&&_5||_5&&_3)){
        //     flag = true;
        //   }
        //   if(d===-1&&(_3&&_5||_5&&_0||_0&&_4||_4&&_2||_2&&_1||_1&&_3)){
        //     flag = true;
        //   }
        // }
        this.data2[idx] = callback(this.data[idx],n,flag);
      }
    }
  }
  swap(){
    let tmp = this.data;
    this.data = this.data2;
    this.data2 = tmp;
  }
}

function Rule(a,n,flag){
  switch(a)
  {
    case 0:
      return 0;
    case 1:
      {
        if(n>=1&&n<=2){
          return 2;
        }
        // if (n === 1) {
        //   return 2;
        // } else if (n === 2 && !flag) {
        //   return 2;
        // }
        return 1;
      };
    case 2:
      return 4;
    case 4:
      return 1;
    case 8:
      {
        if(n>=1&&n<=2){
          return 16;
        }
        return 8;
      }
    case 16:
      return 32;
    case 32:
      return 8;
    case 64:
      return 64;
  }
  return 0;
}

function color_map(v){
  switch(v){
    case 1:
      return "yellow";
    case 2:
      return "red";
    case 4:
      return "blue";
    case 8:
      return "green";
    case 16:
      return "pink";
    case 32:
      return "gray";
    case 64:
      return "purple";
  }
  return "white";
}

class Test {
  constructor() {
    this.canvas = document.createElement("canvas");
    this.container = document.createElement("div");
    this.ctx = this.canvas.getContext("2d");
    this.brush = 1;
    this.dt = 100;
    this.w = 1600;
    this.h = 800;
    this.stop = false;
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.canvas.style = "border:1.2px solid gray;";
    this.grid = new HexGrid(1600 / 20, 800 / 20, 20);
    this.container.appendChild(this.canvas);
  }

  get_canvas() {
    //return this.canvas;
    return this.container;
  }
  draw_hex(i,j,size,color){
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.strokeStyle = "black";
    const h = size / 2;
    const r = size / 1.732+1;
    const rh = r /2;
    i=i*size+((j&1)*0.5*size);
    j = j * size + h;
    //ctx.fillRect(i * size+((j&1)*0.5*size), j * size, size, size);
    ctx.beginPath();
    ctx.moveTo(i - h, j - rh);
    ctx.lineTo(i, j - r);
    ctx.lineTo(i + h, j - rh);
    ctx.lineTo(i + h, j + rh);
    ctx.lineTo(i, j + r);
    ctx.lineTo(i - h, j + rh);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  }

  draw() {
    this.ctx.clearRect(0, 0, this.w, this.h);
    this.grid.render_loop((v, i, j, size) => {
      const color = color_map(v);
      this.draw_hex(i,j,size,color);
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
    const next = [1,2,4,0,0];
    let last = null;
    this.canvas.oncontextmenu = (e) => e.preventDefault();
    this.canvas.onmousedown = (e) => {
      const lbtndown = e.buttons & 1;
      const rbtndown = e.buttons & 2;
      if (e.buttons < 1) return;
      const y = Math.floor(e.offsetY / this.grid.size);
      let x = Math.floor(e.offsetX / this.grid.size+0.5-(y&1)*0.5);
      if(lbtndown){
        const b = next[this.grid.get(x,y)];
        plot(x, y, b);
      }
      if(rbtndown){
        //const b = this.grid.get(x, y) ? 0 : 64;
        plot(x,y,0);
      }
    };
    this.canvas.onmouseup = (e)=>{
      last = null;
    }
    this.canvas.onmousemove = (e) => {
      const lbtndown = e.buttons & 1;
      const rbtndown = e.buttons&2;
      //const mbtndown = e.buttons&4;
      if (e.buttons < 1) return;
      const y = Math.floor(e.offsetY / this.grid.size);
      let x = Math.floor(e.offsetX / this.grid.size+0.5-(y&1)*0.5);
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
    window.onkeydown = (e)=>{
      switch (e.key) {
        case " ":
          this.stop = !this.stop;
          break;
      
        default:
          break;
      }
    }
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

  update(){
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

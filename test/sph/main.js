class Vec2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  //...
}

class Particle {
  constructor(x, y) {
    this.categray = categray;
  }
}

class Grid {
  constructor(w, h) {
    //...
  }
  add(x, y, particle) {}
}

class SPH {
  constructor(w,h){
    this.w = w;
    this.h = h;
    this.fluid_layer = new Grid(w, h);
    this.solid_layer = new Grid(w, h);
    this.boundary_layer = new Grid(w, h);
    //
    this.fluids = [];
    this.solids = [];
    this.boundarys = [];
  }
  

  update(){
    //更新粒子

    //根据粒子新的位置更新网格
    update_layer();
  }

  update_layer(){
    this.fluid_layer = new Grid(w, h);
    this.solid_layer = new Grid(w, h);
    //...
  }

  //...
}

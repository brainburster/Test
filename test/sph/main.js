class Vec2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  copy(){
    return new Vec2(this.x, this.y);
  }

  norm1() {
    return Math.abs(this.x) + Math.abs(this.y);
  }

  norm2() {
    return (this.x ** 2 + this.y ** 2) ** 0.5;
  }

  norm2_2() {
    return this.x ** 2 + this.y ** 2;
  }

  dot(other){
    return this.x * other.x + this.y * other.y;
  }

  cross(other){
    return this.x * other.y - other.x * this.y;
  }

  op_dot(other){
    return this.x(other.x) + this.y(other.y);
  }

  op_cross(other){
    return this.x(other.y) - this.y(other.x);
  }

  op_mul(other){
    return new Vec2(this.x(other.x), this.y(other.y));
  }

  add(other) {
    return new Vec2(this.x + other.x, this.y + other.y);
  }

  sub(other) {
    return new Vec2(this.x - other.x, this.y - other.y);
  }

  mul(other) {
    return new Vec2(this.x * other.x, this.y * other.y);
  }

  div(other) {
    return new Vec2(this.x / other.x, this.y / other.y);
  }

  mod(other){
    return new Vec2(this.x % other.x, this.y % other.y);
  }

  mul_s(rhs) {
    return new Vec2(this.x * rhs, this.y * rhs);
  }

  div_s(rhs) {
    return new Vec2(this.x / rhs, this.y / rhs);
  }

  mod_s(rhs) {
    return new Vec2(this.x % rhs, this.y % rhs);
  }
}

class Particle {
  constructor(x, y) {
    this.x = new Vec2(x, y);
    //...
  }
}

class Grid {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Array(w*h);
  }

  clear(){
    this.data = new Array(this.w * this.h);
  }

  check(x, y) {
    return x >= 0 && x < this.w && y >= 0 && y < this.h;
  }

  set(x, y, particle) {
    if(!this.check(x,y)) return false;
    const index = x + w * y;
    this.data[index] = particle;
    return true;
  }

  get(){
    if(!this.check(x,y)) return null;
    const index = x + w * y;
    return this.data[index]
  }
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

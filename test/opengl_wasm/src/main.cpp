#include "..\header\header.hpp"

int main() {
  GLfloat vertices[] = {
      -.5f, -.5f,
      .5f, -.5f,
      -.5f, .5f,
      .5f, .5f
  };

  const GLchar* vs_str = 
    #include "../shader/vs.glsl"
  ;

  const GLchar* fs_str = 
    #include "../shader/fs.glsl"
  ;
  
  Wnd::init(800, 600);

  GLuint vs = glCreateShader(GL_VERTEX_SHADER);
  glShaderSource(vs, 1, &vs_str, nullptr);
  glCompileShader(vs);
  GLuint fs = glCreateShader(GL_FRAGMENT_SHADER);
  glShaderSource(fs, 1, &fs_str, nullptr);
  glCompileShader(fs);
  GLuint shader_program = glCreateProgram();
  glAttachShader(shader_program, vs);
  glAttachShader(shader_program, fs);
  glLinkProgram(shader_program);
  glUseProgram(shader_program);

  GLuint vbo = 0;
  glGenBuffers(1, &vbo);
  glBindBuffer(GL_ARRAY_BUFFER, vbo);
  glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);
  GLint pos_loc = glGetAttribLocation(shader_program, "position");
  glEnableVertexAttribArray(pos_loc);
  glVertexAttribPointer(pos_loc, 2, GL_FLOAT, GL_FALSE, 0, 0);

  Wnd::run();
  Wnd::onupdate =  [](){
  };
  Wnd::onrender = [](){
    glClearColor(0,0,0,1);
    glClear(GL_COLOR_BUFFER_BIT);
    glfwSwapBuffers(Wnd::window);
    glDrawArrays(GL_TRIANGLE_STRIP, 0, 4);
    glfwPollEvents();
  };
}
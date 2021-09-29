#ifndef _rm_header_hpp
#define _rm_header_hpp
#include <emscripten/emscripten.h>
#define GLFW_INCLUDE_ES3
#include <GLFW/glfw3.h>
#include <iostream>
#include <functional>
#include <math.h>

struct Wnd
{
    using render_callback_t = std::function<void()>;
    using update_callback_t = std::function<void()>;
    static render_callback_t onrender;
    static update_callback_t onupdate;
    static GLFWwindow* window;
    static void init(int w, int h);
    static void run();
};

#endif // _rm_header_hpp
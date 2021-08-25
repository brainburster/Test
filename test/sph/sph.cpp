#include <iostream>

extern "C" void foo()
{
    using namespace std;
    cout  << "hello world" << endl;
}

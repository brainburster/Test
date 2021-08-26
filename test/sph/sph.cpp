#include <math.h>
#include <time.h>

#include <vector>
#include <unordered_map>
#include <functional>
#include <iostream>

struct Vec2
{
    float x;
    float y;
    Vec2 operator+(const Vec2 &rhs) const noexcept
    {
        return {x + rhs.x, y + rhs.y};
    }
    Vec2 operator-(const Vec2 &rhs) const noexcept
    {
        return {x - rhs.x, y - rhs.y};
    }
    Vec2 operator*(const Vec2 &rhs) const noexcept
    {
        return {x * rhs.x, y * rhs.y};
    }
    Vec2 operator/(const Vec2 &rhs) const noexcept
    {
        return {x / rhs.x, y / rhs.y};
    }
    Vec2 operator+(float rhs) const noexcept
    {
        return {x + rhs, y + rhs};
    }
    Vec2 operator-(float rhs) const noexcept
    {
        return {x - rhs, y - rhs};
    }
    Vec2 operator*(float rhs) const noexcept
    {
        return {x * rhs, y * rhs};
    }
    Vec2 operator/(float rhs) const noexcept
    {
        return {x / rhs, y / rhs};
    }
    Vec2 &operator+=(const Vec2 &rhs) noexcept
    {
        x += rhs.x;
        y += rhs.y;
        return *this;
    }
    Vec2 &operator-=(const Vec2 &rhs) noexcept
    {
        x -= rhs.x;
        y -= rhs.y;
        return *this;
    }
    Vec2 &operator*=(const Vec2 &rhs) noexcept
    {
        x *= rhs.x;
        y *= rhs.y;
        return *this;
    }
    Vec2 &operator/=(const Vec2 &rhs) noexcept
    {
        x /= rhs.x;
        y /= rhs.y;
        return *this;
    }
    Vec2 &operator+=(float rhs) noexcept
    {
        x += rhs;
        y += rhs;
        return *this;
    }
    Vec2 &operator-=(float rhs) noexcept
    {
        x -= rhs;
        y -= rhs;
        return *this;
    }
    Vec2 &operator*=(float rhs) noexcept
    {
        x *= rhs;
        y *= rhs;
        return *this;
    }
    Vec2 &operator/=(float rhs) noexcept
    {
        x /= rhs;
        y /= rhs;
        return *this;
    }
    Vec2 pow(float gama) const
    {
        return {powf(x, gama), powf(y, gama)};
    }
    Vec2 &pow_e(float gama)
    {
        x = powf(x, gama);
        y = powf(y, gama);
        return *this;
    }

    float distance(const Vec2 &rhs) const
    {
        const float a = x - rhs.x;
        const float b = y - rhs.y;
        return powf(a * a + b * b, 0.5f);
    }

    float norm() const
    {
        return powf(x * x + y * y, 0.5f);
    }
};

//假设粒子质量始终为1
struct Particle
{
    Vec2 x;
    Vec2 v;
    Vec2 a;
    float p;
    float rho;
};

struct Grid
{
    using callback_t = std::function<void(Particle&)>;
    using value_t = Particle*; //不管理Particle的生命周期
    enum
    {
        grid_size = 50,
        max_particle_num = 20
    };

    std::vector<value_t> p__s; 

    Grid()
    {
        p__s.reserve(max_particle_num);
    }
    void push(value_t p)
    {
        p__s.push_back(p);
    }
    void for_each(callback_t callback)
    {
        for(value_t& p_p : p__s)
        {
            callback(*p_p);
        }
    }
};

struct Grids
{
    using grid_pos_t = std::pair<int,int>;
    using grid_id_t = size_t;
    using value_t = Grid::value_t;
    enum
    {
        max_grid_num = 10000,
        max_particle_num_in_grid = Grid::max_particle_num,
        grid_size = Grid::grid_size
    };

    std::unordered_map<grid_pos_t, grid_id_t> grid_map;
    std::vector<Grid> grids;

    void init()
    {
        grid_map.reserve(max_grid_num);
        grids.reserve(200);
    }

    void reset()
    {
        grid_map.clear();
        grids.clear();
        grid_map.reserve(10000);
        grids.reserve(200);
    }

    void insert(Particle* p)
    {
        grid_pos_t g_pos = {(int)p->x.x / grid_size, (int)p->x.y / grid_size};
        //如果映射中不存在此网格
        if (auto iter = grid_map.find(g_pos); iter != grid_map.end())
        {
            grid_id_t g_id = grids.size();
            if (g_id < max_grid_num)
            {
                grids.emplace_back();
                grids.back().push(p);
                grid_map.insert({g_pos, g_id});
            }
        }
        else
        {
            //粒子数量超过20不用限制，因为是二倍扩容的
            grids[iter->second].push(p);
        }
    }

    
};

struct Utility
{
    static Vec2 clamp(const Vec2 &v, float _min, float _max)
    {
        return {fmin(fmax(v.x, _min), _max), fmin(fmax(v.y, _min), _max)};
    }
};

class SPH
{
public:
    enum
    {
        width = 600,
        height = 800
    };

    static SPH &GetInst()
    {
        static SPH sph{};
        return sph;
    }

    void init()
    {
        srand(time(0));
        particles.resize(100);
        for (auto &p : particles)
        {
            p.x = {(float)(rand() % width), (float)(rand() % height)};
        }
    }

    void clear()
    {
        particles.clear();
    }

    void* get_data() noexcept
    {
        return &particles[0];
    }

    int get_data_length() const noexcept
    {
        return particles.size();
    }

    int get_particle_size() const noexcept
    {
        return sizeof(particles[0]);
    }

    void update()
    {

    }
private:
    SPH() = default;
    std::vector<Particle> particles;
};

extern "C"
{
    void init()
    {
        SPH::GetInst().init();
    }
    float *get_data() 
    {
        SPH::GetInst().get_data();
    }
    void clear() 
    {
        SPH::GetInst().clear();
    }
    void update(float *data) 
    {
        SPH::GetInst().update();
    }
}

extern "C" void foo()
{
    using namespace std;
    cout << "hello world" << endl;
}

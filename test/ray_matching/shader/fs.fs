R"(
//参考了(抄自): Inigo Quilez大佬的https://www.shadertoy.com/view/Xds3zN
precision mediump float;

uniform vec3 state;
uniform int iframe;

//几个简单的有向距离场函数
float sdPlane(vec3 p){
    return p.y;
}

float sdSphere(vec3 p, float s)
{
    return length(p)-s;
}

float sdBox( vec3 p, vec3 b )
{
    vec3 d = abs(p) - b;
    return min(max(d.x,max(d.y,d.z)),0.0) + length(max(d,0.0));
}

//合并, 看来就是个min, 不过附带了一个通道用来保存材质信息
vec2 opU( vec2 d1, vec2 d2 )
{
	return (d1.x<d2.x) ? d1 : d2;
}

//合并后的sdf函数，res.x表示距离，res.y表示材质参数
vec2 map(in vec3 pos)
{
    vec2 res = vec2(1e10, 0.0);
    res = opU(res,vec2(sdSphere(pos-vec3(0.0,0.25,0.0),0.25),20.0));
    res = opU(res,vec2(sdBox(pos-vec3(0.6,0.5,0.0),vec3(0.25,0.5,0.25)),10.0));
    res = opU(res,vec2(sdSphere(pos-vec3(-0.6,0.25,0.0),0.25),30.0));
    return res;
}

//返回view矩阵
//ro: 摄像机位置
//ta: 目标位置
//cr: 沿着ro-ta轴的旋转
mat3 setCamera( in vec3 ro, in vec3 ta, float cr )
{
	vec3 cw = normalize(ta-ro);
	vec3 cp = vec3(sin(cr), cos(cr),0.0);
	vec3 cu = normalize( cross(cw,cp) );
	vec3 cv =          ( cross(cu,cw) );
    return mat3( cu, cv, cw );
}

//射线检测，
//ro: 射线原点
//rd: 射线方向
//res: 返回(时间, 材质参数)
vec2 raycast(in vec3 ro, in vec3 rd)
{
    vec2 res = vec2(-1.0,-1.0);
    float tmin = 1.0;
    float tmax = 20.0;
    float t = tmin;

    float tp1 = (0.0-ro.y)/rd.y;
    if( tp1>0.0 )
    {
        tmax = min( tmax, tp1 );
        res = vec2( tp1, 1.0 );
    }

    for(int i=0; i<100; i++)
    {
        vec2 h = map(ro+rd*t);
        if(abs(h.x)<(1e-4*t))
        {
            res = vec2(t,h.y); 
            break;
        }
        t += h.x;
        if(t>=tmax)
        {
            break;
        }
    }
    return res;
}

// 根据sdf计算软阴影，物体表面到灯光发射一条射线，每次步进检测是否在其他物体里，根据每次步进的距离计算阴影强度
// http://iquilezles.org/www/articles/rmshadows/rmshadows.htm
float calcSoftshadow( in vec3 ro, in vec3 rd, in float mint, in float tmax )
{
    // bounding volume
    float tp = (0.8-ro.y)/rd.y; if( tp>0.0 ) tmax = min( tmax, tp );

    float res = 1.0;
    float t = mint;
    for( int i=0; i<24; i++ )
    {
		float h = map( ro + rd*t ).x;
        float s = clamp(8.0*h/t,0.0,1.0);
        res = min( res, s*s*(3.0-2.0*s) );
        t += clamp( h, 0.02, 0.2 );
        if( res<0.004 || t>tmax ) break;
    }
    return clamp( res, 0.0, 1.0 );
}

// 计算法线：求sdf函数的梯度，(因为梯度方向就是函数值增大的方向)
// http://iquilezles.org/www/articles/normalsSDF/normalsSDF.htm
vec3 calcNormal( in vec3 pos )
{
    vec2 e = vec2(1.0,-1.0)*0.001;
    return normalize( e.xyy*map( pos + e.xyy ).x + 
					  e.yyx*map( pos + e.yyx ).x + 
					  e.yxy*map( pos + e.yxy ).x + 
					  e.xxx*map( pos + e.xxx ).x );
}

//计算AO, 只对法线方向进行了5次采样
float calcAO( in vec3 pos, in vec3 nor )
{
	float occ = 0.0;
    float sca = 1.0;
    for( int i=0; i<5; i++ )
    {
        float h = 0.01 + 0.12*float(i)/4.0;
        float d = map( pos + h*nor ).x;
        occ += (h-d)*sca;
        sca *= 0.95;
        if( occ>0.35 ) break;
    }
    return clamp( 1.0 - 3.0*occ, 0.0, 1.0 ) * (0.5+0.5*nor.y);
}

// 棋盘格
// http://iquilezles.org/www/articles/checkerfiltering/checkerfiltering.htm
float checkersGradBox( in vec2 p, in vec2 dpdx, in vec2 dpdy )
{
    // filter kernel
    vec2 w = abs(dpdx)+abs(dpdy) + 0.001;
    // analytical integral (box filter)
    vec2 i = 2.0*(abs(fract((p-0.5*w)*0.5)-0.5)-abs(fract((p+0.5*w)*0.5)-0.5))/w;
    // xor pattern
    return 0.5 - 0.5*i.x*i.y;                  
}

//材质函数
vec3 material(in float m)
{
    return 0.2 + 0.2*sin( m*2.0 + vec3(0.0,1.0,2.0) );
}

//渲染
vec3 render(in vec3 ro, in vec3 rd, in vec3 rdx, in vec3 rdy)
{
    // background
    vec3 col = vec3(0.7, 0.7, 0.9) - max(rd.y,0.0)*0.3;
    // raycast scene
    vec2 res = raycast(ro,rd);
    float t = res.x;
	float m = res.y;
     if( m>-0.5 )
    {
        vec3 pos = ro + t*rd;
        vec3 nor = (m<1.5) ? vec3(0.0,1.0,0.0) : calcNormal( pos );
        vec3 ref = reflect( rd, nor );
        
        // material        
        col = material(m);
        float ks = 1.0;
        
        //地板
        if( m<1.5 )
        {
            // project pixel footprint into the plane
            vec3 dpdx = ro.y*(rd/rd.y-rdx/rdx.y);
            vec3 dpdy = ro.y*(rd/rd.y-rdy/rdy.y);

            float f = checkersGradBox( 3.0*pos.xz, 3.0*dpdx.xz, 3.0*dpdy.xz );
            col = 0.15 + f*vec3(0.05);
            ks = 0.4;
        }

        // lighting
        float occ = calcAO( pos, nor );
        
		vec3 lin = vec3(0.0);

        // sun
        {
            vec3  lig = normalize( vec3(cos(float(iframe)*0.01), 0.4, sin(float(iframe)*0.01)) );
            vec3  hal = normalize( lig-rd );
            float dif = clamp( dot( nor, lig ), 0.0, 1.0 );
            if( dif>0.0001 )
        	      dif *= calcSoftshadow( pos, lig, 0.02, 2.5 );
			float spe = pow( clamp( dot( nor, hal ), 0.0, 1.0 ),16.0);
                  spe *= dif;
                  spe *= 0.04+0.96*pow(clamp(1.0-dot(hal,lig),0.0,1.0),5.0);
            lin += col*2.20*dif*vec3(1.30,1.00,0.70);
            lin +=     5.00*spe*vec3(1.30,1.00,0.70)*ks;
        }
        // sky
        {
            float dif = sqrt(clamp( 0.5+0.5*nor.y, 0.0, 1.0 ));
                  dif *= occ;
            float spe = smoothstep( -0.2, 0.2, ref.y );
                  spe *= dif;
                  spe *= 0.04+0.96*pow(clamp(1.0+dot(nor,rd),0.0,1.0), 5.0 );
            if( spe>0.001 )
                  spe *= calcSoftshadow( pos, ref, 0.02, 2.5 );
            lin += col*0.60*dif*vec3(0.40,0.60,1.15);
            lin +=     2.00*spe*vec3(0.40,0.60,1.30)*ks;
        }
        // back
        {
        	float dif = clamp( dot( nor, normalize(vec3(0.5,0.0,0.6))), 0.0, 1.0 )*clamp( 1.0-pos.y,0.0,1.0);
                  dif *= occ;
        	lin += col*0.55*dif*vec3(0.25,0.25,0.25);
        }
        // sss
        {
            float dif = pow(clamp(1.0+dot(nor,rd),0.0,1.0),2.0);
                  dif *= occ;
        	lin += col*0.25*dif*vec3(1.00,1.00,1.00);
        }
        
		col = lin;

        col = mix( col, vec3(0.7,0.7,0.9), 1.0-exp( -0.0001*t*t*t ) );
    }

    return vec3( clamp(col,0.0,1.0) );
}

void main()
{
    //创建摄像机
    vec3 ta = vec3(0.0, 0.2, 0.0);
    vec3 front = vec3(0.0,0.0,0.0);
    float yaw = state.x/180.0*3.14159;
    float pitch = state.y/180.0*3.1459;
    float d = state.z;
    front.x = -cos(yaw) * cos(pitch);
	front.y = -sin(pitch);
	front.z = -sin(yaw) * cos(pitch);
    vec3 ro = ta-front*d;
    mat3 view = setCamera(ro,ta, 0.0);
    vec2 p = (gl_FragCoord.xy*2.0-vec2(800.0,600.0))/600.0;
    const float fl = 2.5;
    vec3 rd = view * normalize(vec3(p,fl) );
    vec2 px = (2.0*(gl_FragCoord.xy+vec2(1.0,0.0))-vec2(800.0,600.0))/600.0;
    vec2 py = (2.0*(gl_FragCoord.xy+vec2(0.0,1.0))-vec2(800.0,600.0))/600.0;
    vec3 rdx = view * normalize( vec3(px,fl) );
    vec3 rdy = view * normalize( vec3(py,fl) );
    vec3 col = render( ro, rd, rdx, rdy );
    col = pow( col, vec3(0.4545) );
    gl_FragColor = vec4(col, 1.0);
}
)"

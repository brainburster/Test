R"(
precision mediump float;

void main()
{
    gl_FragColor = vec4(gl_FragCoord.xy/600.0, 1.0, 1.0);
}
)"

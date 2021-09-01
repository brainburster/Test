@echo off
emcc sph.cpp -o sph.js -O3^
 -s TOTAL_MEMORY=128MB -std=c++17^
 -s EXPORTED_FUNCTIONS="[\"_init\",\"_update\",\"_clear\",\"_get_data\",\"_get_data_length\",\"_get_particle_size\"]"
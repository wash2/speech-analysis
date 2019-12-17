#!/bin/bash

export GCC_COLORS='error=01;31:warning=01;35:note=01;36:caret=01;32:locus=01:quote=01'

mkdir -p cmake-build-release
cd cmake-build-release

TOOLCHAIN=$EMSDK/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake

cmake -DCMAKE_TOOLCHAIN_FILE=$TOOLCHAIN -DCMAKE_BUILD_TYPE=Release ..
make -j 4 -k

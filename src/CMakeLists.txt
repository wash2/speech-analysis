cmake_minimum_required(VERSION 3.0)
project(main)
cmake_policy(SET CMP0074 NEW)

set(CMAKE_CXX_STANDARD 17)

set(CMAKE_CXX_FLAGS "-static")
set(CMAKE_CXX_FLAGS_DEBUG "-O0 -g3")
set(CMAKE_CXX_FLAGS_RELEASE "-Os -ftree-vectorize -s -g")

set(SOURCES
        analysis/Analyser_mainLoop.cpp
        analysis/Analyser.cpp
        analysis/Analyser.h
        analysis/parts/formants.cpp
        analysis/parts/lpc.cpp
        analysis/parts/median.cpp
        analysis/parts/pitch.cpp
        analysis/parts/preprocess.cpp
        analysis/parts/resample.cpp
        analysis/parts/spectrum.cpp
        audio/AudioCapture.cpp
        audio/AudioCapture.h
        audio/RingBuffer.cpp
        audio/RingBuffer.h)

find_package(Eigen3 3.3 REQUIRED NO_MODULE)
find_package(FFTW3 REQUIRED DOUBLE_LIB)

include_directories(
        ${EIGEN_INCLUDE_DIR}
        ${FFTW3_INCLUDE_DIRS}
        ${libspeech_INCLUDE_DIR}
)

add_library(speech_analysis ${SOURCES})

target_link_libraries(speech_analysis
        ${libspeech_LIBRARY}
        Eigen3::Eigen
        ${FFTW3_LIBRARIES})


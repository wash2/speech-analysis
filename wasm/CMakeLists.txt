cmake_minimum_required(VERSION 3.0)
project(main)
cmake_policy(SET CMP0074 NEW)

set(CMAKE_CXX_STANDARD 17)

set(CMAKE_CXX_FLAGS "-static --bind -s MODULARIZE=1 -s SINGLE_FILE=1")
set(CMAKE_CXX_FLAGS_DEBUG "-O0 -g3")
set(CMAKE_CXX_FLAGS_RELEASE "-Os -ftree-vectorize -s -g")

set(ANALYSER_SOURCES
        analysis/Analyser_mainLoop.cpp
        analysis/Analyser_get.cpp
        analysis/Analyser_params.cpp
        analysis/Analyser.cpp
        analysis/Analyser.h
        analysis/parts/formants.cpp
        analysis/parts/lpc.cpp
        analysis/parts/median.cpp
        analysis/parts/pitch.cpp
        analysis/parts/preprocess.cpp
        analysis/parts/resample.cpp
        analysis/parts/spectrum.cpp
        analysis/bindings.cpp)

set(CAPTURE_SOURCES
        audio/AudioCapture.cpp
        audio/AudioCapture.h
        audio/RingBuffer.cpp
        audio/RingBuffer.h
        audio/bindings.cpp)

set(CAPTURE_JS_AUDIO ${CMAKE_SOURCE_DIR}/audio/wasm-audio-helper.js)
set(CAPTURE_JS_PROCESSOR ${CMAKE_SOURCE_DIR}/audio/processor.js)

find_package(Eigen3 3.3 REQUIRED NO_MODULE)

include_directories(
        ${EIGEN_INCLUDE_DIR}
        ${FFTW3_INCLUDE_DIRS}
        ${libspeech_INCLUDE_DIR}
)

add_executable(speech_analysis ${ANALYSER_SOURCES})
set_target_properties(speech_analysis PROPERTIES LINK_FLAGS "-s EXPORT_NAME=AnalyserModule")

target_link_libraries(speech_analysis
        ${libspeech_LIBRARY}
        Eigen3::Eigen
        ${FFTW3_LIBRARIES})

add_executable(speech_capture ${CAPTURE_SOURCES})
set_target_properties(speech_capture PROPERTIES LINK_FLAGS "-s EXPORT_NAME=CaptureModule -s BINARYEN_ASYNC_COMPILATION=0 -s MODULARIZE_INSTANCE=1 --post-js ${CAPTURE_JS_AUDIO} --post-js ${CAPTURE_JS_PROCESSOR}")

add_custom_target(capture_js DEPENDS ${CAPTURE_JS_AUDIO} ${CAPTURE_JS_PROCESSOR})
add_dependencies(speech_capture capture_js)

target_link_libraries(speech_capture
        Eigen3::Eigen)

add_custom_target(speech_wasm)
add_dependencies(speech_wasm speech_analysis speech_capture)

install(FILES
    ${CMAKE_BINARY_DIR}/speech_capture.js
    DESTINATION
    ${CMAKE_SOURCE_DIR}/../public/js)

install(FILES
    ${CMAKE_BINARY_DIR}/speech_analysis.js
    DESTINATION
    ${CMAKE_SOURCE_DIR}/../src/analyser)

install(CODE "
file(READ ${CMAKE_SOURCE_DIR}/../src/analyser/speech_analysis.js FILE_CNT LIMIT_COUNT 1)
set(FILE_CNT \"/* eslint-disable */\n\${FILE_CNT}\")
file(WRITE ${CMAKE_SOURCE_DIR}/../src/analyser//speech_analysis.js \"\${FILE_CNT}\")
")


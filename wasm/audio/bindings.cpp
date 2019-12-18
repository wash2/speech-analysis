#include <emscripten/bind.h>
#include "AudioCapture.h"

using namespace emscripten;

EMSCRIPTEN_BINDINGS(audio_capture) {
    class_<AudioCapture>("AudioCapture")
        .constructor<int>()
        .function("process", &AudioCapture::process, allow_raw_pointers())
        .function("getSampleRate", &AudioCapture::getSampleRate)
        .function("readBlock", &AudioCapture::readBlock);
}

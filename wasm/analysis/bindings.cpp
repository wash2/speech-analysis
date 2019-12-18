#include <emscripten/bind.h>
#include "Analyser.h"

using namespace emscripten;

EMSCRIPTEN_BINDINGS(analyser_module) {
    class_<Analyser>("Analyser")
        .constructor()
        .function("update", &Analyser::update);
}

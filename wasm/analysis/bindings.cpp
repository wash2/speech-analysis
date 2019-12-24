#include <emscripten/bind.h>
#include <Eigen/Core>
#include "Analyser.h"

using namespace emscripten;
using namespace Eigen;

EMSCRIPTEN_BINDINGS(analyser_module) {
    class_<Analyser>("Analyser")
        .constructor()
        .function("update", &Analyser::update)
        .function("getFrame", &Analyser::getFrame);
    
    class_<ArrayXd>("ArrayXd")
        .constructor()
        .function("size", &ArrayXd::size)
        .function("get", select_overload<const double& (Index) const>(&ArrayXd::coeff));
}

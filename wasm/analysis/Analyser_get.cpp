#include "Analyser.h"

using namespace emscripten;

val Analyser::getFrame()
{
    val result = val::object();

    double pitch = getLastPitchFrame();

    auto formantFrame = getLastFormantFrame();
    val formantArray = val::array();
    for (int n = 0; n < formantFrame.nFormants; ++n) {
        val frm = val::object();

        frm.set("frequency", formantFrame.formant[n].frequency);
        frm.set("bandwidth", formantFrame.formant[n].bandwidth);

        formantArray.set(n, frm);
    }

    result.set("isVoiced", pitch > 0);
    result.set("pitch", pitch);
    result.set("formants", formantArray);    

    return result;
}


#include "Analyser.h"

using namespace emscripten;

val Analyser::getFrame(int iframe)
{
    val result = val::object();

    double pitch = getPitchFrame(iframe);

    auto formantFrame = getFormantFrame(iframe);
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

val Analyser::getLastFrame()
{
    return getFrame(frameCount - 1);
}

val Analyser::getTracks()
{
    val result = val::array();

    for (int iframe = 0; iframe < frameCount; ++iframe) {
        result.set(iframe, getFrame(iframe));
    }

    return result;
}

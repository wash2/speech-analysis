#include "Analyser.h"

using namespace emscripten;

val Analyser::getParameters()
{
    val result = val::object();
    
    result.set("frameCount", getFrameCount());
    result.set("isAnalysing", isAnalysing());
    result.set("fftSize", getFftSize());
    result.set("lpOrder", getLinearPredictionOrder());
    result.set("maxFrequency", getMaximumFrequency());

    return result;
}

void Analyser::setParameters(val params)
{
#define setIfExists(name, setter, type) if (params.hasOwnProperty(name)) setter(params[name].as<type>());

    setIfExists("frameCount", setFrameCount, int);
    setIfExists("isAnalysing", setAnalysing, bool);
    setIfExists("fftSize", setFftSize, int);
    setIfExists("lpOrder", setLinearPredictionOrder, int);
    setIfExists("maxFrequency", setMaximumFrequency, double);
}

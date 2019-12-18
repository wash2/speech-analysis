//
// Created by rika on 16/11/2019.
//

#include <chrono>
#include "Analyser.h"
#include "Pitch/Pitch.h"
#include "Signal/Filter.h"
#include "Signal/Window.h"

using namespace Eigen;

void Analyser::update(emscripten::val data, int sampleRate)
{
    if (!doAnalyse) {
        return;
    }

    // Read captured audio.
    int length = data["length"].as<int>();
    x.conservativeResize(length);
    for (int i = 0; i < length; ++i) {
        x(i) = data[i].as<double>();
    }
    fs = sampleRate;

    // Remove DC by subtraction of the mean.
    x -= x.mean();
    
    // Apply windowing.
    applyWindow();

    // Analyse spectrum if enabled.
    analyseSpectrum();

    // Resample audio.
    resampleAudio(2 * maximumFrequency);

    // Get a pitch estimate.
    analysePitch();

    // Apply pre-emphasis.
    applyPreEmphasis();

    // Perform LP analysis.
    analyseLp();

    // Perform formant analysis from LP coefficients.
    analyseFormantLp();

    // Lock the tracks to prevent data race conditions.
    mutex.lock();

    // Update the tracks.
    spectra.pop_front();
    spectra.push_back(lastSpectrumFrame);
    pitchTrack.pop_front();
    pitchTrack.push_back(lastPitchFrame);
    formantTrack.pop_front();
    formantTrack.push_back(lastFormantFrame);
    
    // Smooth out the tracks.
    applyMedianFilters();
    
    // Unock the tracks.
    mutex.unlock();

    // Invoke the new-frame callback function.
    newFrameCallback();
}

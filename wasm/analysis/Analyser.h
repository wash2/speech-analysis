//
// Created by rika on 16/11/2019.
//

#ifndef SPEECH_ANALYSIS_ANALYSER_H
#define SPEECH_ANALYSIS_ANALYSER_H

#include <Eigen/Core>
#include <emscripten/val.h>
#include <deque>
#include <memory>
#include "../audio/AudioCapture.h"
#include "Formant/Formant.h"

struct SpecFrame {
    double fs;
    int nfft;
    Eigen::ArrayXd spec;
};

class Analyser {
public:
    Analyser();

    void setAnalysing(bool);

    void setFftSize(int);
    void setLinearPredictionOrder(int);
    void setMaximumFrequency(double);
    void setFrameCount(int);

    [[nodiscard]] bool isAnalysing() const;
    [[nodiscard]] int getFftSize() const;
    [[nodiscard]] int getLinearPredictionOrder() const;
    [[nodiscard]] double getMaximumFrequency() const;

    [[nodiscard]] int getFrameCount();

    [[nodiscard]] const SpecFrame & getSpectrumFrame(int iframe);
    [[nodiscard]] const Formant::Frame & getFormantFrame(int iframe);
    [[nodiscard]] double getPitchFrame(int iframe);

    [[nodiscard]] const SpecFrame & getLastSpectrumFrame();
    [[nodiscard]] const Formant::Frame & getLastFormantFrame();
    [[nodiscard]] double getLastPitchFrame();

    void update(emscripten::val data, int sampleRate);
    emscripten::val getFrame(int iframe);
    emscripten::val getLastFrame();
    emscripten::val getTracks();
    
    emscripten::val getParameters();
    void setParameters(emscripten::val params);

private:
    void _updateFrameCount(int);

    void applyWindow();
    void analyseSpectrum();
    void analysePitch();
    void resampleAudio(double newFs);
    void applyPreEmphasis();
    void analyseLp();
    void analyseFormantLp();
    void analyseFormantDeep();
    void applyMedianFilters();

    // Parameters.
    int frameCount;

    bool doAnalyse;
    int nfft;
    double maximumFrequency;
    int lpOrder;

    // Intermediate variables for analysis.
    Eigen::ArrayXd x;
    double fs;
    LPC::Frame lpcFrame;

    std::deque<SpecFrame> spectra;
    Formant::Frames formantTrack;
    std::deque<double> pitchTrack;

    SpecFrame lastSpectrumFrame;
    Formant::Frame lastFormantFrame;
    double lastPitchFrame;
};


#endif //SPEECH_ANALYSIS_ANALYSER_H

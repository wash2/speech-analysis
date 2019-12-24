//
// Created by rika on 16/11/2019.
//

#include "Analyser.h"

using namespace Eigen;

static const Formant::Frame defaultFrame = {
        .nFormants = 0,
        .formant = {},
        .intensity = 1.0,
};

static const SpecFrame defaultSpec = {
        .fs = 0,
        .nfft = 512,
        .spec = ArrayXd::Zero(512),
};

Analyser::Analyser()
    : doAnalyse(true),
      nfft(512),
      lpOrder(10),
      maximumFrequency(5000.0),
      frameSpace(10.0),
      windowSpan(5.0)
{
    frameCount = 0;
    _updateFrameCount();

    // Initialize the audio frames to zero.
    x.setZero(512);
}

void Analyser::toggle() {
    doAnalyse = !doAnalyse;
}

bool Analyser::isAnalysing() const {
    return doAnalyse;
}

void Analyser::setFftSize(int _nfft) {
    nfft = _nfft;
}

int Analyser::getFftSize() const {
    return nfft;
}

void Analyser::setLinearPredictionOrder(int _lpOrder) {
    lpOrder = std::clamp(_lpOrder, 5, 22);
}

int Analyser::getLinearPredictionOrder() const {
    return lpOrder;
}

void Analyser::setMaximumFrequency(double _maximumFrequency) {
    maximumFrequency = std::clamp(_maximumFrequency, 2500.0, 7000.0);
}

double Analyser::getMaximumFrequency() const {
    return maximumFrequency;
}

void Analyser::setFrameSpace(const std::chrono::duration<double, std::milli> & _frameSpace) {
    frameSpace = _frameSpace;
    _updateFrameCount();
}

const std::chrono::duration<double, std::milli> & Analyser::getFrameSpace() const {
    return frameSpace;
}

void Analyser::setWindowSpan(const std::chrono::duration<double> & _windowSpan) {
    windowSpan = _windowSpan;
    _updateFrameCount();
}

const std::chrono::duration<double> & Analyser::getWindowSpan() const {
    return windowSpan;
}

int Analyser::getFrameCount() {
    return frameCount;
}

const SpecFrame & Analyser::getSpectrumFrame(int _iframe) {
    int iframe = std::clamp(_iframe, 0, frameCount - 1);
    return spectra.at(iframe);
}

const SpecFrame & Analyser::getLastSpectrumFrame() {
    return spectra.back();
}

const Formant::Frame & Analyser::getFormantFrame(int _iframe) {
    int iframe = std::clamp(_iframe, 0, frameCount - 1);
    return formantTrack.at(iframe);
}

const Formant::Frame & Analyser::getLastFormantFrame() {
    return formantTrack.back();
}

double Analyser::getPitchFrame(int _iframe) {
    int iframe = std::clamp(_iframe, 0, frameCount - 1);
    return pitchTrack.at(iframe);
}

double Analyser::getLastPitchFrame() {
    return pitchTrack.back();
}

void Analyser::_updateFrameCount() {
    const int newFrameCount = (1000 * windowSpan.count()) / frameSpace.count();

    if (frameCount < newFrameCount) {
        int diff = newFrameCount - frameCount;
        spectra.insert(spectra.begin(), diff, defaultSpec);
        pitchTrack.insert(pitchTrack.begin(), diff, 0.0);
        formantTrack.insert(formantTrack.begin(), diff, defaultFrame);
    }
    else if (frameCount > newFrameCount) {
        int diff = frameCount - newFrameCount;
        spectra.erase(spectra.begin(), spectra.begin() + diff);
        pitchTrack.erase(pitchTrack.begin(), pitchTrack.begin() + diff);
        formantTrack.erase(formantTrack.begin(), formantTrack.begin() + diff);
    }

    frameCount = newFrameCount;
}

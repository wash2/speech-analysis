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
      maximumFrequency(5000.0)
{
    _updateFrameCount(512);

    // Initialize the audio frames to zero.
    x.setZero(512);
}

void Analyser::setAnalysing(bool _doAnalyse) {
    doAnalyse = _doAnalyse;
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

void Analyser::setFrameCount(int _frameCount) {
    _updateFrameCount(_frameCount);
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

void Analyser::_updateFrameCount(int newFrameCount) {
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

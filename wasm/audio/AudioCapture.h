//
// Created by clo on 12/09/2019.
//

#ifndef SPEECH_ANALYSIS_AUDIOCAPTURE_H
#define SPEECH_ANALYSIS_AUDIOCAPTURE_H

#include <Eigen/Core>
#include <emscripten/val.h>
#include "RingBuffer.h"

#define CAPTURE_DURATION 35.0
#define CAPTURE_SAMPLE_COUNT(sampleRate) ((CAPTURE_DURATION * sampleRate) / 1000)

#define BUFFER_SAMPLE_COUNT(sampleRate) (CAPTURE_SAMPLE_COUNT(sampleRate))

class AudioCapture {
public:
    AudioCapture(int sampleRate);

    void process(uintptr_t inputPtr, int length, int channelCount);

    [[nodiscard]]
    int getSampleRate();

    void readBlock(emscripten::val data);

private:
    RingBuffer audioBuffer;

    Eigen::ArrayXd capture;
    int sampleRate;

};

#endif //SPEECH_ANALYSIS_AUDIOCAPTURE_H

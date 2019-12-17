//
// Created by clo on 12/09/2019.
//

#ifndef SPEECH_ANALYSIS_AUDIOCAPTURE_H
#define SPEECH_ANALYSIS_AUDIOCAPTURE_H

#include <Eigen/Core>
#include "RingBuffer.h"

#define CAPTURE_DURATION 35.0
#define CAPTURE_SAMPLE_COUNT(sampleRate) ((CAPTURE_DURATION * sampleRate) / 1000)

#define BUFFER_SAMPLE_COUNT(sampleRate) (CAPTURE_SAMPLE_COUNT(sampleRate))

class AudioCapture {
public:
    AudioCapture(int sampleRate);

    void process(uintptr_t inputPtr, unsigned length, unsigned channelCount);

    [[nodiscard]]
    int getSampleRate() const noexcept;

    void readBlock(Eigen::ArrayXd & capture) noexcept;

private:
    RingBuffer audioBuffer;

    int sampleRate;

};

#endif //SPEECH_ANALYSIS_AUDIOCAPTURE_H

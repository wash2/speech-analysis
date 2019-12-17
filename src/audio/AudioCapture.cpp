//
// Created by clo on 12/09/2019.
//

#include <iostream>
#include "AudioCapture.h"

AudioCapture::AudioCapture(int sampleRate)
    : sampleRate(sampleRate),
      audioBuffer(BUFFER_SAMPLE_COUNT(sampleRate))
{
}

void AudioCapture::process(uintptr_t inputPtr, unsigned length, unsigned channelCount)
{
    float * input = reinterpret_cast<float *>(inputPtr);

    Eigen::ArrayXXf inputData(channelCount, length);
    for (unsigned ch = 0; ch < channelCount; ++ch) {
        for (unsigned i = 0; i < length; ++i) {
            inputData(ch, i) = input[ch * length + i];
        }
    }

    Eigen::ArrayXd inputMean = inputData.rowwise().mean().cast<double>();
    audioBuffer.writeInto(inputMean);
}

int AudioCapture::getSampleRate() const noexcept {
    return sampleRate;
}

void AudioCapture::readBlock(Eigen::ArrayXd & capture) noexcept {
    capture.conservativeResize(CAPTURE_SAMPLE_COUNT(sampleRate));
    audioBuffer.readFrom(capture);
}


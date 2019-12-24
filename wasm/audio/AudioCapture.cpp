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

void AudioCapture::process(uintptr_t inputPtr, int length, int channelCount)
{
    float * input = reinterpret_cast<float *>(inputPtr);

    Eigen::ArrayXd x = Eigen::Map<Eigen::ArrayXf>(input, length).cast<double>();
    audioBuffer.writeInto(x);

    /*
    Eigen::ArrayXXf inputData(channelCount, length);
    for (unsigned ch = 0; ch < channelCount; ++ch) {
        for (unsigned i = 0; i < length; ++i) {
            inputData(ch, i) = input[ch * length + i];
        }
    }

    Eigen::ArrayXd inputMean = inputData.colwise().mean().cast<double>();
    audioBuffer.writeInto(inputMean);*/
}

int AudioCapture::getSampleRate() {
    return sampleRate;
}

void AudioCapture::readBlock(emscripten::val data) {
    const int length = CAPTURE_SAMPLE_COUNT(sampleRate);
    capture.conservativeResize(length);
    audioBuffer.readFrom(capture);

    for (int i = 0; i < length; ++i) {
        const double y = capture(i);
        if (std::isnormal(y))
            data.set(i, y);
        else
            data.set(i, 0);
    }
}

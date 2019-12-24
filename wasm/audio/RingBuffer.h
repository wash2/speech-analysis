//
// Created by rika on 11/10/2019.
//

#ifndef SPEECH_ANALYSIS_RINGBUFFER_H
#define SPEECH_ANALYSIS_RINGBUFFER_H

#include <Eigen/Core>
#include <mutex>
#include <vector>

class RingBuffer {
public:
    explicit RingBuffer(int capacity = 0);

    void writeInto(const Eigen::ArrayXd & in);
    void readFrom(Eigen::ArrayXd & out);

    void setCapacity(int newCapacity);

private:
    int capacity, writeCursor;
    std::vector<double> data;
};

#endif //SPEECH_ANALYSIS_RINGBUFFER_H

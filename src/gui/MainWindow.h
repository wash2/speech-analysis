//
// Created by rika on 06/12/2019.
//

#ifndef SPEECH_ANALYSIS_MAINWINDOW_H
#define SPEECH_ANALYSIS_MAINWINDOW_H

#include "rpmalloc.h"
#include "../audio/miniaudio.h"
#include <QtWidgets>
#include <QSharedPointer>
#include <utility>
#include "../audio/AudioDevices.h"
#include "../audio/AudioInterface.h"
#include "../audio/SineWave.h"
#include "../audio/NoiseFilter.h"
#include "AnalyserCanvas.h"
#include "PowerSpectrum.h"
#include "../analysis/Analyser.h"
#include "LPC/Frame/LPC_Frame.h"

// PLATFORM MACROS

#ifdef Q_OS_ANDROID
#   define UI_BAR_SETTINGS
#   define UI_BAR_FIELDS
#else
#   define UI_SHOW_SETTINGS
#   define UI_SHOW_BAR
#   define UI_BAR_LINKS
#   define UI_BAR_PAUSE
#endif

#ifdef Q_OS_WASM
#elif !defined(Q_OS_ANDROID)
#   define UI_DISPLAY_SETTINGS_IN_DIALOG
#   define UI_DOCK_FLOATABLE
#   define UI_SHOW_DEVICE_SETTING
#   define UI_SHOW_FRAME_SETTINGS
#   define UI_BAR_FULLSCREEN
#endif

#if 0
#   define UI_HAS_LEFT_BAR 1
#else
#   define US_HAS_LEFT_BAR 0
#endif

#if defined(UI_BAR_FIELDS)
#   define UI_HAS_CENTER_BAR 1
#else
#   define UI_HAS_CENTER_BAR 0
#endif

#if defined(UI_BAR_SETTINGS) || defined(UI_BAR_LINKS) || defined(UI_BAR_PAUSE) || defined(UI_BAR_FULLSCREEN)
#   define UI_HAS_RIGHT_BAR 1
#else
#   define UI_HAS_RIGHT_BAR 0
#endif

#if defined(Q_OS_WASM) || defined(Q_OS_ANDROID)
#   define TIMER_SLOWER 1
#else
#   define DO_UPDATE_DEVICES 1
#endif

// SETTINGS MACROS

#define a_set(attr, attr2) set##attr(analyser->get##attr2())
#define a_set_count(attr, attr2) set##attr(analyser->get##attr2().count())
#define a_set_enum(attr, attr2) set##attr(static_cast<int>(analyser->get##attr2()))

#define c_set(attr, attr2) set##attr(canvas->get##attr2())

// ---------------

using DevicePair = std::pair<bool, const ma_device_id *>;

Q_DECLARE_METATYPE(DevicePair);

constexpr int numFormants = 4;

extern QFont * appFont;

class MainWindow : public QMainWindow {
    Q_OBJECT
public:
    MainWindow();
    ~MainWindow();

    void saveSettings();

protected:
    bool eventFilter(QObject * obj, QEvent * event) override;
    void closeEvent(QCloseEvent * event) override;

signals:
    void newFramesTracks(int nframe, double maxFreq, FormantMethod formantAlg, const rpm::deque<double> & pitches, const Formant::Frames & formants);
    void newFramesSpectrum(int nframe, int nNew, double maxFreq, rpm::deque<SpecFrame>::const_iterator begin, rpm::deque<SpecFrame>::const_iterator end);
    void newFramesLpc(double maxFreq, SpecFrame lpcFrame);
    void newFramesUI(int nframe, double maxFreq);

private:
    void updateFields();

#ifdef UI_SHOW_SETTINGS
    void updateColorButtons(); 
#endif

#ifdef UI_BAR_SETTINGS
    void openSettings();
#endif

    void toggleAnalyser();
    void toggleFullscreen();
    
    void cleanup();

    ma_context maCtx;
    AudioDevices * devs;
    SineWave * sineWave;
    NoiseFilter * noiseFilter;
    AudioInterface * audioInterface;
    Analyser * analyser;

#if defined(Q_OS_MAC)
    void * audioInterfaceMem;
#endif

    QTimer timer;

    QStringList availableFftSizes;
    QStringList availablePitchAlgs;
    QStringList availableFormantAlgs;
    QStringList availableFreqScales;
    QStringList availableColorMaps;

    QWidget * uiFields();
    QDockWidget * uiFieldsDock(QWidget * fields);

    QWidget * uiAnalysisSettings();
    QWidget * uiDisplaySettings();
    QDockWidget * uiSettingsDock(QWidget * analysisSettings, QWidget * displaySettings);

    QWidget * uiBarLeft();
    QWidget * uiBarCenter(QWidget * fields);
    QWidget * uiBarRight();
    QWidget * uiBar(QWidget * fields);

    QWidget * uiCentral();

#ifdef UI_DISPLAY_SETTINGS_IN_DIALOG
    QWidget * displaySettings;
#endif

#if DO_UPDATE_DEVICES
    void updateDevices();
    QComboBox * inputDevice;
#endif

    QBoxLayout * fieldsLayout;

#ifdef UI_SHOW_SETTINGS
    QPushButton * pitchColor;
    std::array<QPushButton *, numFormants> formantColors;
#endif

#ifdef UI_BAR_PAUSE
    QPushButton * pause;
#endif

#ifdef UI_BAR_FULLSCREEN
    QPushButton * fullscreen;
#endif

    AnalyserCanvas * canvas;
    PowerSpectrum * powerSpectrum;

    QLineEdit * fieldPitch;
    rpm::vector<QLineEdit *> fieldFormant;
    QLineEdit * fieldOq;

};

#endif //SPEECH_ANALYSIS_MAINWINDOW_H

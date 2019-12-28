import React from 'react'
import Grid from '@material-ui/core/Grid'
import Button from '@material-ui/core/Button'
import Typography from '@material-ui/core/Typography'
import './App.css'
import AudioCapture from './analyser/AudioCapture'
import AnalyserModule from './analyser/speech_analysis'

import AnalyserCanvas from './components/AnalyserCanvas'
import Footer from './components/Footer'

const SETUP_NO = 0
const SETUP_MIC = 1
const SETUP_FILE = 2

class App extends React.PureComponent {

  constructor(props) {
    super(props)
    this.state = {
      isSettingUp: false,
      isSetup: SETUP_NO,
      tracks: [
        {
          isVoiced: false,
          pitch: 0,
          formants: [],
        },
      ],
      params: {},
      updateBit: 0,
    }

    this.capture = new AudioCapture()

    AnalyserModule().then(module => {
      this.analyser = new module.Analyser()
    })

 }

  componentDidMount() {
    const callback = () => {
      this.loopCallback()
      window.requestAnimationFrame(callback)
    };

    callback()

  }

  setupMicCapture = async () => {
    this.setState({isSettingUp: true})

    await this.capture.createMicrophoneSource()
    await this.setupCapture()

    this.setState({isSetup: SETUP_MIC})
    this.setState({isSettingUp: false})
  }

  setupFileCapture = async () => {
    this.fileInput.value = ''
    this.fileInput.click()
    this.fileInput.onchange = async (oce) => {
      const files = oce.target.files
      if (files.length >= 1) {
        this.setState({isSettingUp: true})

        const fileReader = new FileReader()
        fileReader.readAsArrayBuffer(files[0])
        fileReader.onload = async (fre) => {
          await this.capture.createFileSource(fre.target.result)
          await this.setupCapture()

          this.setState({isSetup: SETUP_FILE})
          this.setState({isSettingUp: false})
        }
      }
    }
  }

  setupCapture = async () => {
    await this.capture.loadModules()

    this.capture.setDataCallback(this.nextBuffer)
  }

  loopCallback = () => {
    this.setState({updateBit: !this.state.updateBit})

    if (this.state.isSetup) {
      this.capture.requestData()
    }
  }

  nextBuffer = (data) => {
    if (this.analyser === undefined) return

    this.analyser.update(data, 44100)

    const tracks = this.analyser.getTracks()
    const params = this.analyser.getParameters()

    this.setState({tracks, params})
  }

  setAnalyse = () => this.analyser.setParameters({isAnalysing: true})
  unsetAnalyse = () => this.analyser.setParameters({isAnalysing: false})

  stopFile = () => {
    this.capture.stopFileSource()
    this.setState({isSetup: SETUP_NO})
  }

  render() {

    const {
      isSettingUp,
      isSetup,
      tracks,
      params: {
        frameCount,
        isAnalysing,
        fftSize,
        lpOrder,
        maxFrequency,
      },
      updateBit,
    } = this.state

    return (
        <div className="App">
          <div className="App-controls">
            <div>
              {
                isSetup !== SETUP_MIC ? (
                  <Button variant="contained" onClick={this.setupMicCapture} disabled={isSettingUp}>
                    Microphone
                  </Button>
                ) : (
                  <Button variant="contained" onClick={isAnalysing ? this.unsetAnalyse : this.setAnalyse}>
                    {isAnalysing ? 'Pause' : 'Resume'}
                  </Button>
                )
              }
            </div>
            <div>
              {
                isSetup !== SETUP_FILE ? (
                  <Button variant="contained" onClick={this.setupFileCapture} disabled={isSettingUp}>
                    Load file
                  </Button>
                ) : (
                  <Button variant="contained" onClick={this.stopFile}>
                    Stop
                  </Button>
                )
              }
            </div>
            <input ref={r => this.fileInput = r} style={{display: 'none'}} type="file"/>
          </div>
          <div className="App-container">
            <AnalyserCanvas
              updateBit={updateBit}
              scale={'MEL'}
              maximumFrequency={5500}
              tracks={tracks}
            />
          </div>
          <Footer/>
        </div>
    )
  }
}

export default App

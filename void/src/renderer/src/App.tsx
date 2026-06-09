import { BarAnalyser } from "./components/BarAnaliser";
import { useEffect, useRef } from "react";
import { AudioController } from "./components/AudioControler";
import { Div } from "./components/addons/ctsx";
import { endlnr,enddata } from "./components/addons/HOC";
import { toVoidUrl } from "./components/CONST";
import boxesManipulator from "./components/boxm";
import Bars from "./components/Bars";
import BgPic from "./components/bgpic";
import FallingShapes from "./components/anishapes";
function App(): React.JSX.Element {
  const initialized = useRef(false);
  enddata.set("rgb", "255,255,255"); // default to white — will be updated by HOC's "analyser.color" event
  const boxs = Array.from({ length: 20 }, (_, i) => <Div key={i} className="lines">
    {Array.from({ length: 10 }, (_, i) => <Div key={i} className="box">
  </Div>)}
  </Div>);

  useEffect(() => {
    if (initialized.current) return; // block double-init in StrictMode
    initialized.current = true;

    boxesManipulator();

    const audioCtx = new AudioContext();
    const audioElement = document.getElementById("audio") as HTMLAudioElement;
    const controller = new AudioController(audioElement);
    const source = audioCtx.createMediaElementSource(audioElement);
    const analyser = new BarAnalyser(audioCtx, source);

    analyser.connect(audioCtx.destination);
    analyser.start();

  

    controller.load(toVoidUrl("C:\\Users\\MC DESMOND\\Music\\CMUSIC\\DARE [SLOWED X REVERB].mp3"));
    controller.play();
    controller.repeat(true);
  }, []);

  return (
    <Div className="App">
      <Div className="boxes">
         <Div className="boxes-glow"></Div>
        {boxs}
      </Div>
      <FallingShapes />
      {/* <BgPic></BgPic> */}
      <Bars></Bars>
      <audio id="audio" crossOrigin="anonymous"></audio>  {/* no src here — controller handles it */}
    </Div>
  );
}

export default App;
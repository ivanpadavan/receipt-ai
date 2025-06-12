"use client";

import { PageState } from "@/app/state";
import { useRef, useState } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";

type WebcamCaptureProps = {
  pageState: PageState,
}

export default function WebcamCapture({ pageState: { camera } }: WebcamCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const [paused, setPaused] = useState(false);

  const handleCapture = () => {
    const screenshot = webcamRef.current?.getScreenshot();

    if (camera.status === 'ready' && screenshot) {
      camera.appendPicture(screenshot);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black w-full h-full">
      <Webcam
        onCanPlayCapture={() => camera.status === 'pending' && camera.initialized()}
        onPause={() => setPaused(true)}
        onPlay={() => setPaused(false)}
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/jpeg"
        videoConstraints={{
          facingMode: "environment"
        }}
        className="w-full h-full object-cover"
      />

        <div className="relative bottom-10 left-0 right-0 flex justify-center gap-3">
          {camera.status === "ready" && !paused && (
            <>
              <Button
                onClick={() => webcamRef.current?.video?.pause()}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-full shadow-md"
              >
                Capture
              </Button>
              <Button
                onClick={camera.close}
                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full shadow-md"
              >
                Cancel
              </Button></>
          )}
          {paused && (
            <>
              <Button
                onClick={() => webcamRef.current?.video?.play()}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full shadow-md"
              >
                Clear Image
              </Button>
              <Button
                onClick={handleCapture}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-full shadow-md"
              >
                Extract Receipt Data
              </Button>
            </>
          )}
        </div>
    </div>
  );
}

"use client";

import { PageState } from "@/app/state";
import { useEffect, useRef, useState } from "react";
import Camera from "@/components/Camera";
import { Button } from "@/components/ui/button";

type WebcamCaptureProps = {
  pageState: PageState,
}

export default function WebcamCapture({ pageState: { camera } }: WebcamCaptureProps) {
  const cameraRef = useRef<Camera>(null);
  const [paused, setPaused] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);

  useEffect(() => {
    paused && cameraRef.current
      ? cameraRef.current.getScreenshot().then(setScreenshot)
      : setScreenshot(null)
  }, [paused])

  const handleCapture = () => {
    if (camera.status === 'ready' && screenshot) {
      camera.appendPicture(screenshot);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black w-full h-full">
      <Camera
        onCanPlayCapture={() => camera.status === 'pending' && camera.initialized()}
        onPause={() => setPaused(true)}
        onPlay={() => setPaused(false)}
        ref={cameraRef}
        audio={false}
        screenshotFormat="image/jpeg"
        videoConstraints={{
          facingMode: "environment"
        }}
        className="w-full h-full object-cover"
      />
      {screenshot && (<img src={screenshot} className="w-full h-full object-cover z-0 top-0 absolute" />)}

        <div className="relative bottom-10 left-0 right-0 flex justify-center gap-3 z-10">
          {camera.status === "ready" && !paused && (
            <>
              <Button
                onClick={() => cameraRef.current?.video?.pause()}
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
                onClick={() => cameraRef.current?.video?.play()}
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

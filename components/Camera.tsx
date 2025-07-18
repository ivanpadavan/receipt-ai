import * as React from "react";

// polyfill based on https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
(function polyfillGetUserMedia() {
  if (typeof window === 'undefined') {
    return;
  }

  // Older browsers might not implement mediaDevices at all, so we set an empty object first
  if (navigator.mediaDevices === undefined) {
    (navigator as any).mediaDevices = {};
  }

  // Some browsers partially implement mediaDevices. We can't just assign an object
  // with getUserMedia as it would overwrite existing properties.
  // Here, we will just add the getUserMedia property if it's missing.
  if (navigator.mediaDevices.getUserMedia === undefined) {
    navigator.mediaDevices.getUserMedia = function(constraints) {
      // First get ahold of the legacy getUserMedia, if present
      const getUserMedia =
        (navigator as any)['getUserMedia'] ||
          (navigator as any)['webkitGetUserMedia'] ||
            (navigator as any)['mozGetUserMedia'] ||
              (navigator as any)['msGetUserMedia'];

      // Some browsers just don't implement it - return a rejected promise with an error
      // to keep a consistent interface
      if (!getUserMedia) {
        return Promise.reject(
          new Error("getUserMedia is not implemented in this browser")
        );
      }

      // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
      return new Promise(function(resolve, reject) {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    };
  }
})();

function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

function resizeImageToCover(img: { width: number, height: number }, targetWidth: number, targetHeight: number): [number, number, number, number] {
  // Calculate aspect ratios
  const imgAspect = img.width / img.height;
  const targetAspect = targetWidth / targetHeight;

  let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

  if (imgAspect > targetAspect) {
    // Image is wider than target - crop sides
    drawHeight = targetHeight;
    drawWidth = drawHeight * imgAspect;
    offsetX = (targetWidth - drawWidth) / 2;
  } else {
    // Image is taller than target - crop top/bottom
    drawWidth = targetWidth;
    drawHeight = drawWidth / imgAspect;
    offsetY = (targetHeight - drawHeight) / 2;
  }

  return [offsetX, offsetY, drawWidth, drawHeight];
}

interface ScreenshotDimensions {
  width: number;
  height: number;
}

interface ChildrenProps {
  getScreenshot: (screenshotDimensions?: ScreenshotDimensions) => Promise<string | null>;
}

export type CameraProps = Omit<React.HTMLProps<HTMLVideoElement>, "ref"> & {
  audio: boolean;
  audioConstraints?: MediaStreamConstraints["audio"];
  disablePictureInPicture: boolean;
  forceScreenshotSourceSize: boolean;
  imageSmoothing: boolean;
  mirrored: boolean;
  minScreenshotHeight?: number;
  minScreenshotWidth?: number;
  onUserMedia: (stream: MediaStream) => void;
  onUserMediaError: (error: string | DOMException) => void;
  screenshotFormat: "image/webp" | "image/png" | "image/jpeg";
  screenshotQuality: number;
  videoConstraints?: MediaStreamConstraints["video"];
  children?: (childrenProps: ChildrenProps) => JSX.Element;
}

interface WebcamState {
  hasUserMedia: boolean;
  src?: string;
}

export default class Camera extends React.Component<CameraProps, WebcamState> {
  static defaultProps = {
    audio: false,
    disablePictureInPicture: false,
    forceScreenshotSourceSize: false,
    imageSmoothing: true,
    mirrored: false,
    onUserMedia: () => undefined,
    onUserMediaError: () => undefined,
    screenshotFormat: "image/webp",
    screenshotQuality: 0.92,
  };

  private canvas: HTMLCanvasElement | null = null;

  private ctx: CanvasRenderingContext2D | null = null;

  private requestUserMediaId = 0;

  private unmounted = false;

  stream: MediaStream | null = null;

  video: HTMLVideoElement | null = null;

  constructor(props: CameraProps) {
    super(props);
    this.state = {
      hasUserMedia: false
    };
  }

  componentDidMount() {
    const { state, props } = this;
    this.unmounted = false;

    if (!hasGetUserMedia()) {
      props.onUserMediaError("getUserMedia not supported");

      return;
    }

    if (!state.hasUserMedia) {
      this.requestUserMedia();
    }

    if (props.children && typeof props.children != 'function') {
      console.warn("children must be a function");
    }
  }

  componentDidUpdate(nextProps: CameraProps) {
    const { props } = this;

    if (!hasGetUserMedia()) {
      props.onUserMediaError("getUserMedia not supported");

      return;
    }

    const audioConstraintsChanged =
      JSON.stringify(nextProps.audioConstraints) !==
      JSON.stringify(props.audioConstraints);
    const videoConstraintsChanged =
      JSON.stringify(nextProps.videoConstraints) !==
      JSON.stringify(props.videoConstraints);
    const minScreenshotWidthChanged =
      nextProps.minScreenshotWidth !== props.minScreenshotWidth;
    const minScreenshotHeightChanged =
      nextProps.minScreenshotHeight !== props.minScreenshotHeight;
    if (
      videoConstraintsChanged ||
      minScreenshotWidthChanged ||
      minScreenshotHeightChanged
    ) {
      this.canvas = null;
      this.ctx = null;
    }
    if (audioConstraintsChanged || videoConstraintsChanged) {
      this.stopAndCleanup();
      this.requestUserMedia();
    }
  }

  componentWillUnmount() {
    this.unmounted = true;
    this.stopAndCleanup();
  }

  private static stopMediaStream(stream: MediaStream | null) {
    if (stream) {
      if (stream.getVideoTracks && stream.getAudioTracks) {
        stream.getVideoTracks().map(track => {
          stream.removeTrack(track);
          track.stop();
        });
        stream.getAudioTracks().map(track => {
          stream.removeTrack(track);
          track.stop()
        });
      } else {
        ((stream as unknown) as MediaStreamTrack).stop();
      }
    }
  }

  private stopAndCleanup() {
    const { state } = this;

    if (state.hasUserMedia) {
      Camera.stopMediaStream(this.stream);

      if (state.src) {
        window.URL.revokeObjectURL(state.src);
      }
    }
  }

  async getScreenshot(screenshotDimensions?: ScreenshotDimensions): Promise<string | null> {
    const { state, props } = this;

    if (!state.hasUserMedia) return null;

    const canvas = await this.getCanvas(screenshotDimensions);
    return (
      canvas &&
      canvas.toDataURL(props.screenshotFormat, props.screenshotQuality)
    );
  }

  async getCanvas(screenshotDimensions?: ScreenshotDimensions) {
    const { state, props } = this;

    if (!this.video) {
      return null;
    }

    if (!state.hasUserMedia || !this.video.videoHeight) return null;

    if (!this.ctx) {
      let canvasWidth = this.video.videoWidth;
      let canvasHeight = this.video.videoHeight;
      if (!this.props.forceScreenshotSourceSize) {
        const aspectRatio = canvasWidth / canvasHeight;

        canvasWidth = props.minScreenshotWidth || this.video.clientWidth;
        canvasHeight = canvasWidth / aspectRatio;

        if (
          props.minScreenshotHeight &&
          canvasHeight < props.minScreenshotHeight
        ) {
          canvasHeight = props.minScreenshotHeight;
          canvasWidth = canvasHeight * aspectRatio;
        }
      }

      this.canvas = document.createElement("canvas");
      this.canvas.width = screenshotDimensions?.width ||  canvasWidth;
      this.canvas.height = screenshotDimensions?.height || canvasHeight;
      this.ctx = this.canvas.getContext("2d");
    }

    const { ctx, canvas } = this;

    if (ctx && canvas) {

      // adjust the height and width of the canvas to the given dimensions
      canvas.width = screenshotDimensions?.width ||  canvas.width;
      canvas.height = screenshotDimensions?.height || canvas.height;

      // mirror the screenshot
      if (props.mirrored) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.imageSmoothingEnabled = props.imageSmoothing;

      let imageSource: HTMLVideoElement | ImageBitmap;
      try {
        if ('ImageCapture' in window && this.stream) {
          const ic = new (window.ImageCapture as any)(this.stream.getVideoTracks()[0]);
          const pc = await ic.getPhotoCapabilities();
          console.log(pc);
          const blob = await ic.takePhoto({ imageHeight: pc.imageHeight.max, imageWidth: pc.imageWidth.max, fillLightMode: 'auto' });
          const { width, height } = getComputedStyle(this.video);
          imageSource = await createImageBitmap(blob, ...resizeImageToCover({ width: pc.imageWidth.max, height: pc.imageHeight.max }, parseFloat(width), parseFloat(height)));
        } else {
          throw new Error('ImageCapture not supported');
        }
      } catch (e) {
        console.error(e);
        imageSource = this.video;
      }
      // @ts-ignore
      ctx.drawImage(imageSource, 0, 0, screenshotDimensions?.width || canvas.width, screenshotDimensions?.height || canvas.height);

      // invert mirroring
      if (props.mirrored) {
        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);
      }
    }

    return canvas;
  }

  private requestUserMedia() {
    const { props } = this;

    const sourceSelected = (
      audioConstraints: boolean | MediaTrackConstraints | undefined,
      videoConstraints: boolean | MediaTrackConstraints | undefined,
    ) => {
      const constraints: MediaStreamConstraints = {
        video: typeof videoConstraints !== "undefined" ? videoConstraints : true
      };

      if (props.audio) {
        constraints.audio =
          typeof audioConstraints !== "undefined" ? audioConstraints : true;
      }

      this.requestUserMediaId++
      const myRequestUserMediaId = this.requestUserMediaId

      navigator.mediaDevices
        .getUserMedia(constraints)
        .then(stream => {
          if (this.unmounted || myRequestUserMediaId !== this.requestUserMediaId) {
            Camera.stopMediaStream(stream);
          } else {
            this.handleUserMedia(null, stream);
          }
        })
        .catch(e => {
          this.handleUserMedia(e);
        });
    };

    if ("mediaDevices" in navigator) {
      sourceSelected(props.audioConstraints, props.videoConstraints);
    } else {
      const optionalSource = (id: string | null) => ({ optional: [{ sourceId: id }] }) as MediaTrackConstraints;

      const constraintToSourceId = (constraint: MediaTrackConstraints) => {
        const { deviceId } = constraint;

        if (typeof deviceId === "string") {
          return deviceId;
        }

        if (Array.isArray(deviceId) && deviceId.length > 0) {
          return deviceId[0];
        }

        if (typeof deviceId === "object" &&  'ideal' in deviceId && deviceId.ideal) {
          return deviceId.ideal as string;
        }

        throw new Error("Invalid deviceId constraint");
      };

      // @ts-ignore: deprecated api
      MediaStreamTrack.getSources(sources => {
        let audioSource: string | null = null;
        let videoSource: string | null = null;

        sources.forEach((source: MediaStreamTrack) => {
          if (source.kind === "audio") {
            audioSource = source.id;
          } else if (source.kind === "video") {
            videoSource = source.id;
          }
        });

        const audioSourceId = constraintToSourceId(props.audioConstraints as any);
        if (audioSourceId) {
          audioSource = audioSourceId;
        }

        const videoSourceId = constraintToSourceId(props.videoConstraints as any);
        if (videoSourceId) {
          videoSource = videoSourceId;
        }

        sourceSelected(
          optionalSource(audioSource),
          optionalSource(videoSource)
        );
      });
    }
  }

  private handleUserMedia(err: any, stream?: MediaStream) {
    const { props } = this;

    if (err || !stream) {
      this.setState({ hasUserMedia: false });
      props.onUserMediaError(err);

      return;
    }

    this.stream = stream;

    try {
      if (this.video) {
        this.video.srcObject = stream;
      }
      this.setState({ hasUserMedia: true });
    } catch (error) {
      this.setState({
        hasUserMedia: true,
        src: window.URL.createObjectURL(stream as any)
      });
    }

    props.onUserMedia(stream);
  }

  render() {
    const { state, props } = this;

    const {
      audio,
      forceScreenshotSourceSize,
      disablePictureInPicture,
      onUserMedia,
      onUserMediaError,
      screenshotFormat,
      screenshotQuality,
      minScreenshotWidth,
      minScreenshotHeight,
      audioConstraints,
      videoConstraints,
      imageSmoothing,
      mirrored,
      style = {},
      children,
      ...rest
    } = props;

    const videoStyle = mirrored ? { ...style, transform: `${style.transform || ""} scaleX(-1)` } : style;

    const childrenProps: ChildrenProps = {
      getScreenshot: this.getScreenshot.bind(this),
    };

    return (
      <>
        <video
          autoPlay
          disablePictureInPicture={disablePictureInPicture}
          src={state.src}
          muted={!audio}
          playsInline
          ref={ref => {
            this.video = ref;
          }}
          style={videoStyle}
          {...rest}
        />
        {children && children(childrenProps)}
      </>
    );
  }
}

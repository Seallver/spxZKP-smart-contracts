"use client";
import React, { useEffect, useRef } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";

interface Props {
  onResult: (result: string) => void;
  onError?: (error: any) => void;
}

const QrScanner: React.FC<Props> = ({ onResult, onError }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserQRCodeReader | null>(null);

  useEffect(() => {
    const codeReader = new BrowserQRCodeReader();
    codeReaderRef.current = codeReader;

    const startScanner = async () => {
      try {
        const devices = await BrowserQRCodeReader.listVideoInputDevices();
        if (!devices.length) throw new Error("未找到摄像头设备");

        const selectedDeviceId = devices[0].deviceId;

        await codeReader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current!,
          (result, error, controls) => {
            if (result) {
              onResult(result.getText());
              controls.stop(); // 停止扫码
            } else if (error && error.name !== "NotFoundException") {
              onError?.(error);
            }
          },
        );
      } catch (err) {
        onError?.(err);
      }
    };

    startScanner();

    return () => {
      BrowserQRCodeReader.releaseAllStreams;
      // 停止视频解码
    };
  }, [onResult, onError]);

  return <video ref={videoRef} style={{ width: "100%", borderRadius: 8 }} />;
};

export default QrScanner;

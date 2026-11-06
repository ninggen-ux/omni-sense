import React, { useEffect, useRef, useState } from "react";
import {
    PoseLandmarker,
    FilesetResolver,
    DrawingUtils,
} from "@mediapipe/tasks-vision";
import cardData from "./assets/data/message-card.json";
import MessageCard from "./assets/components/MessageCard";
import { detectPostureStatus } from "./assets/misc/utils.ts";
import "./assets/scss/app.scss";

export default function App() {
    interface StreamUrl {
        host: string;
        path: string;
    }

    const [poseLandmarkerResult, setPoseLandmarkerResult] =
        useState<PoseLandmarker | null>(null);

    const [postureIndex, setPostureIndex] = useState<number>(4);

    const [streamUrl, setStreamUrl] = useState<StreamUrl>({
        host: "0.0.0.0",
        path: "video",
    });

    const canvas = useRef<HTMLCanvasElement>(null);
    const img = useRef<HTMLImageElement>(null);

    useEffect(() => {
        let landmarker: PoseLandmarker | null = null;

        async function apiCall() {
            try {
                const vision = await FilesetResolver.forVisionTasks("/wasm");
                landmarker = await PoseLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: "../model/pose_landmarker_full.task",
                    },
                    runningMode: "IMAGE",
                });
                setPoseLandmarkerResult(landmarker);
            } catch (err) {
                console.error("Gagal menginisialisasi MediaPipe:", err);
            }
        }

        apiCall();

        return () => {
            landmarker?.close();
        };
    }, []);

    useEffect(() => {
        let animationFrameId: number;

        function renderLoop() {
            if (
                img.current &&
                canvas.current &&
                poseLandmarkerResult &&
                img.current.complete &&
                img.current.naturalWidth > 0 &&
                img.current.naturalHeight > 0
            ) {
                if (
                    canvas.current.width !== img.current.clientWidth ||
                    canvas.current.height !== img.current.clientHeight
                ) {
                    canvas.current.width = img.current.clientWidth;
                    canvas.current.height = img.current.clientHeight;
                }

                try {
                    const result = poseLandmarkerResult.detect(img.current);

                    if (result.landmarks && result.landmarks.length > 0) {
                        setPostureIndex(
                            detectPostureStatus(result.landmarks[0]),
                        );
                    } else if (
                        result.landmarks &&
                        result.landmarks.length === 0
                    ) {
                        setPostureIndex(3);
                    }

                    const ctx = canvas.current.getContext("2d");
                    if (ctx) {
                        ctx.clearRect(
                            0,
                            0,
                            canvas.current.width,
                            canvas.current.height,
                        );
                        const drawingUtils = new DrawingUtils(ctx);

                        if (result.landmarks) {
                            for (const landmark of result.landmarks) {
                                drawingUtils.drawConnectors(
                                    landmark,
                                    PoseLandmarker.POSE_CONNECTIONS,
                                    {
                                        color: "#00FF00",
                                        lineWidth: 1,
                                    },
                                );
                                drawingUtils.drawLandmarks(landmark, {
                                    color: "#FF0000",
                                    lineWidth: 2,
                                    radius: 2,
                                });
                            }
                        }
                    }
                } catch (err) {
                    console.warn(err);
                }
            }

            animationFrameId = requestAnimationFrame(renderLoop);
        }

        if (poseLandmarkerResult) {
            renderLoop();
        }

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [poseLandmarkerResult, streamUrl?.host]);

    function handleChange<T extends HTMLSelectElement | HTMLInputElement>(
        e: React.ChangeEvent<T>,
    ) {
        const { name, value } = e.target;

        setStreamUrl((prevState) => {
            return { ...prevState, [name]: value } as StreamUrl;
        });
    }

    return (
        <main>
            <section
                className="input-field-section"
                style={
                    postureIndex === 4
                        ? {
                              backgroundColor: cardData[4].backgroundColor,
                              color: cardData[4].textColor,
                          }
                        : {
                              backgroundColor: cardData[0].backgroundColor,
                              color: cardData[0].textColor,
                          }
                }
            >
                <h1>Silahkan Masukkan IP Dibawah!</h1>
                <div>
                    <p>http://</p>
                    <input
                        type="text"
                        name="host"
                        value={streamUrl?.host}
                        onChange={handleChange<HTMLInputElement>}
                    />
                    <p>/</p>
                    <select
                        name="path"
                        onChange={handleChange<HTMLSelectElement>}
                        value={streamUrl.path}
                    >
                        <option value="video">video</option>
                        <option value="stream">stream</option>
                    </select>
                </div>
            </section>
            <section className="img-section">
                <img
                    ref={img}
                    src={`http://${streamUrl.host}/${streamUrl.path}`}
                    crossOrigin="anonymous"
                    onError={() => {
                        setPostureIndex(4);
                    }}
                />
                <canvas ref={canvas} id="myCanvas"></canvas>
            </section>
            <MessageCard
                header={cardData[postureIndex].header}
                body={cardData[postureIndex].body}
                img={cardData[postureIndex].img}
                backgroundColor={cardData[postureIndex].backgroundColor}
                textColor={cardData[postureIndex].textColor}
            />
        </main>
    );
}

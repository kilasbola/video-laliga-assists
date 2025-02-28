import React from "react"
import "./style.css"
import {Composition, Folder} from "remotion"
import {defaultMyCompProps, VIDEO_FPS, VIDEO_HEIGHT, VIDEO_WIDTH} from "@/types/constants"
import {BarRace} from "@/remotion/charts/BarRace"

// Konfigurasi durasi video
const DURATION_CONFIG = {
    FPS: 60,                    // Frame per detik (60 fps untuk gerakan sangat halus)
    DURATION_IN_SECONDS: 240,    // Durasi total dalam detik (ubah sesuai kebutuhan)
    // Total frame = FPS * DURATION_IN_SECONDS
    // Untuk 60 FPS:
    // - Untuk 1 menit = 60 fps * 60 detik = 3600 frames
    // - Untuk 2 menit = 60 fps * 120 detik = 7200 frames
    // - Untuk 3 menit = 60 fps * 180 detik = 10800 frames
    // - Untuk 4 menit = 60 fps * 240 detik = 14400 frames
    // - Untuk 5 menit = 60 fps * 300 detik = 18000 frames
}

const baseProps = {
    durationInFrames: DURATION_CONFIG.FPS * DURATION_CONFIG.DURATION_IN_SECONDS,
    fps: VIDEO_FPS,
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT
}

export const RemotionRoot: React.FC = () => {
    return (
        <>
            <Folder name="Current">
                <Composition
                    id="bar-race"
                    component={BarRace}
                    {...baseProps}
                    fps={DURATION_CONFIG.FPS}
                    // Untuk mengubah durasi, cukup ubah DURATION_IN_SECONDS di DURATION_CONFIG
                    durationInFrames={DURATION_CONFIG.FPS * DURATION_CONFIG.DURATION_IN_SECONDS}
                    defaultProps={defaultMyCompProps}
                />
            </Folder>
        </>
    )
}

import { z } from "zod"
import assistsData from '../public/laliga-asisst-dataset-monthly.json'

// Konfigurasi durasi video
const TARGET_DURATION_MINUTES = 4  // Target durasi dalam menit
export const VIDEO_FPS = 60

// Hitung durasi dan frame per data secara otomatis
const TOTAL_DATA_POINTS = assistsData.length
const TOTAL_FRAMES = TARGET_DURATION_MINUTES * 60 * VIDEO_FPS  // Total frame untuk 4 menit
export const FRAMES_PER_DATA = Math.floor(TOTAL_FRAMES / TOTAL_DATA_POINTS)
export const DURATION_IN_FRAMES = TOTAL_DATA_POINTS * FRAMES_PER_DATA

export const VIDEO_WIDTH = 1920
export const VIDEO_HEIGHT = 1080
export const COMP_NAME = "ds-current"

export const CompositionProps = z.object({
  keyframes: z.array(z.any())
})

export type MyCompProps = z.infer<typeof CompositionProps>

export const defaultMyCompProps: MyCompProps = {
  keyframes: assistsData
}

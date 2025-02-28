import {
    AbsoluteFill,
    continueRender,
    delayRender,
    Easing,
    interpolate,
    staticFile,
    useCurrentFrame,
    useVideoConfig,
    spring,
    Img,
} from "remotion"
import React, {useEffect, useState} from "react"
import * as d3 from "d3"
import {MyCompProps} from '@/types/constants'
import { FRAMES_PER_DATA } from '@/types/constants'  // Tambahkan import ini
// Import Rubik dari @remotion/google-fonts
import { loadFont } from "@remotion/google-fonts/Rubik"
import playerCustomization from '../../public/player-customization.json'

// Load font
const { fontFamily } = loadFont() // Ini akan memuat semua weight Rubik secara otomatis

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

const BarChartKeyFrames = (
    {
        colorByName,
        keyframes,
    }: {
        colorByName: Map<string, string>,
        keyframes: any[]
    },
) => {
    const frame = useCurrentFrame()
    const {fps} = useVideoConfig()

    // Debug data yang masuk
    console.log("Frame:", frame)
    console.log("Sample keyframe:", keyframes[0])

    const currentIndex = Math.min(Math.floor(frame / fps * 10), keyframes.length - 1)
    const currentData = keyframes[currentIndex]

    if (!currentData) {
        console.error('No data available at index:', currentIndex)
        return null
    }

    // Mengubah format data: dari {player: score} menjadi [{name, value}]
    const items = Object.entries(currentData)
        .filter(([key]) => key !== 'year' && key !== 'month') // Mengabaikan metadata
        .map(([playerName, assists]) => ({
            name: playerName,
            value: Number(assists) || 0 // Memastikan nilai valid
        }))
        .filter(item => item.value > 0) // Hanya pemain dengan assists
        .sort((a, b) => b.value - a.value) // Sort descending
        .slice(0, 15) // Top 15 pemain

    console.log("Processed items:", items)

    const maxValue = Math.max(...items.map(x => x.value))
    const maxWidth = 1000

    return (
        <div style={{
            padding: '20px',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#fff'
        }}>
            {/* Menampilkan tahun dan bulan */}
            <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                fontSize: '24px',
                color: '#000',
                fontWeight: 'bold'
            }}>
                {currentData.year}/{String(currentData.month).padStart(2, '0')}
            </div>

            {items.map((item, i) => (
                <div
                    key={item.name}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        height: '40px',
                        marginBottom: '10px',
                        fontSize: '16px'
                    }}
                >
                    <div style={{
                        width: '200px',
                        textAlign: 'right',
                        paddingRight: '10px',
                        color: '#000',
                        fontWeight: 'bold'
                    }}>
                        {item.name}
                    </div>
                    <div
                        style={{
                            width: `${(item.value / maxValue) * maxWidth}px`,
                            minWidth: '50px',
                            height: '35px',
                            backgroundColor: '#1e88e5',
                            display: 'flex',
                            alignItems: 'center',
                            paddingLeft: '10px'
                        }}
                    >
                        <span style={{color: '#fff'}}>
                            {numberWithCommas(item.value)}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    )
}

// group
// 'date', 'name', 'category', 'value'

function computeKeyframes(data) {
    const grp = {}
    data.forEach((item) => {
        const date = item.date
        if (!grp[date]) {
            grp[date] = []
        }
        grp[date].push(item)
    })
    const datevalues = Array.from(d3.rollup(data, ([d]) => d.value, d => +d.date, d => d.name))
        .map(([date, data]) => [new Date(date), data])
        .sort(([a], [b]) => d3.ascending(a, b))
    console.log("datevalues", datevalues)
    const names = new Set(data.map(d => d.name))
    const n = 12

    function rank(value) {
        const data = Array.from(names, name => ({name, value: value(name)}))
        data.sort((a, b) => d3.descending(a.value, b.value))
        for (let i = 0; i < data.length; ++i) data[i].rank = Math.min(n, i)
        return data
    }

    const ranked = rank(name => datevalues[0][1].get(name))
    console.log("ranked", ranked)
    const keyframes = []
    const k = 10
    let ka, a, kb, b
    for ([[ka, a], [kb, b]] of d3.pairs(datevalues)) {
        for (let i = 0; i < k; ++i) {
            const t = i / k
            keyframes.push([
                new Date(ka * (1 - t) + kb * t),
                rank(name => (a.get(name) || 0) * (1 - t) + (b.get(name) || 0) * t),
            ])
        }
    }
    keyframes.push([new Date(kb), rank(name => b.get(name) || 0)])
    return keyframes
}


function computeColorByName(data: any) {
    const colorByName = new Map(data.map(d => [d.name, d.color]))
    const category = new Set(data.map(d => d.name))
    const color = d3.scaleOrdinal()
        .domain(category)
        .range(d3.schemeTableau10)
    data.forEach((item) => {
        item.color = color(item.name)
        colorByName.set(item.name, item.color)
    })
    return colorByName
}

export const DURATION_IN_FRAMES = 14400  // 4 menit pada 60fps
export const VIDEO_FPS = 60

class SpringSimulator {
  constructor(stiffness = 0.3, damping = 0.7, mass = 1) {
    this.stiffness = stiffness;
    this.damping = damping;
    this.mass = mass;
    this.velocity = 0;
  }

  update(current, target, deltaTime) {
    const force = (target - current) * this.stiffness;
    const acceleration = force / this.mass;
    
    this.velocity += acceleration * deltaTime;
    this.velocity *= (1 - this.damping);
    
    return current + this.velocity * deltaTime;
  }
}

// Konfigurasi animasi mirip amCharts 5
const ANIMATION_CONFIG = {
    // Spring config yang lebih smooth
    spring: {
        damping: 25,    // Lebih tinggi untuk mengurangi oscillation
        mass: 1.5,      // Lebih berat untuk gerakan lebih natural
        stiffness: 70,  // Lebih rendah untuk transisi lebih halus
        overshootClamping: false
    },
    // Entry animation
    entry: {
        delay: 3,
        duration: 15,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1) // Cubic bezier mirip amCharts
    }
}

// Material Design color palette
const materialColors = [
    '#F44336', // Red
    '#E91E63', // Pink
    '#9C27B0', // Purple
    '#673AB7', // Deep Purple
    '#3F51B5', // Indigo
    '#2196F3', // Blue
    '#03A9F4', // Light Blue
    '#00BCD4', // Cyan
    '#009688', // Teal
    '#4CAF50', // Green
    '#8BC34A', // Light Green
    '#CDDC39', // Lime
    '#FFC107', // Amber
    '#FF9800', // Orange
    '#FF5722', // Deep Orange
    '#795548', // Brown
    '#607D8B', // Blue Grey
];

// Tambahkan konfigurasi falling animation
const FALLING_CONFIG = {
    spring: {
        damping: 15,     // Lebih rendah untuk efek bounce
        mass: 2,         // Lebih berat untuk efek falling
        stiffness: 50,   // Lebih rendah untuk gerakan lebih lambat
        overshootClamping: false
    }
};

export const BarRace: React.FC<MyCompProps> = ({keyframes}) => {
    const frame = useCurrentFrame()
    const {fps, durationInFrames} = useVideoConfig()
    
    // Cache warna untuk setiap pemain
    const colorCache = React.useMemo(() => {
        const cache = new Map<string, string>();
        return cache;
    }, []);

    const getPlayerColor = React.useCallback((playerName: string) => {
        if (!colorCache.has(playerName)) {
            // Pilih warna random dari palet
            const randomColor = materialColors[Math.floor(Math.random() * materialColors.length)];
            colorCache.set(playerName, randomColor);
        }
        return colorCache.get(playerName);
    }, []);

    // Cache untuk URL profile
    const profileUrlCache = React.useMemo(() => new Map<string, string>(), []);

    const getPlayerProfile = React.useCallback((playerName: string) => {
        if (!profileUrlCache.has(playerName)) {
            profileUrlCache.set(
                playerName,
                playerCustomization[playerName]?.profileUrl || 
                `https://ui-avatars.com/api/?name=${encodeURIComponent(playerName)}&background=random`
            );
        }
        return profileUrlCache.get(playerName);
    }, []);

    // Menghitung indeks saat ini dengan lebih presisi
    const currentIndex = Math.min(
        Math.floor((frame / durationInFrames) * keyframes.length),
        keyframes.length - 1
    )

    // Mendapatkan data saat ini
    const currentData = keyframes[currentIndex]

    if (!currentData) {
        console.error('No data available at index:', currentIndex)
        return null
    }

    // Mengubah format data: dari {player: score} menjadi [{name, value}]
    const items = Object.entries(currentData)
        .filter(([key]) => key !== 'year' && key !== 'month')
        .map(([playerName, assists]) => ({
            name: playerName,
            value: Number(assists) || 0
        }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)  // Mengubah dari 12 menjadi 10

    // Konfigurasi ukuran dan spacing
    const CONFIG = {
        MAX_BAR_WIDTH: 1600,     // Lebar maksimum bar
        BAR_HEIGHT: 90,          // Tinggi bar
        BAR_GAP: 12,            // Jarak antar bar
        NAME_WIDTH: 250,         // Lebar kolom nama
        FONT_SIZE: 27,          // Ukuran font default
        VALUE_FONT_SIZE: 30,     // Ukuran font untuk nilai
        DATE_FONT_SIZE: 32,      // Ukuran font untuk tanggal
        CONTAINER_PADDING: 20,   // Padding container
        LEFT_MARGIN: 20,        // Margin kiri baru
        RIGHT_MARGIN: 40        // Margin kanan baru
    }

    const maxValue = Math.max(...items.map(x => x.value))

    // Konfigurasi untuk timeline
    const TIMELINE_CONFIG = {
        HEIGHT: 40,          // Tinggi area timeline
        PADDING: 60,         // Padding dari tepi
        FONT_SIZE: 18,       // Ukuran font untuk label tahun
        TICK_HEIGHT: 10,     // Tinggi tanda tahun
        BACKGROUND: '#2d2c2c', // Warna background timeline #f0f0f0
        LEFT_MARGIN: 40,    // Margin khusus untuk sisi kiri
        RIGHT_MARGIN: 40,    // Kembali ke margin normal
        // Pengaturan jarak antar tahun
        YEAR_GAP: 3,  // Setiap 3 tahun
        // Pengaturan label tahun
        LABEL_OFFSET: 15,    // Jarak label tahun dari garis timeline
        LABEL_BACKGROUND: 'transparent', // Warna background label tahun
        LABEL_PADDING: '2px 4px', // Padding untuk label tahun
    }

    // Animasi rotasi untuk emoji bola
    // Menggunakan interpolate untuk mengontrol rotasi:
    // - [0, durationInFrames]: range frame dari awal hingga akhir video
    // - [0, 720]: range derajat rotasi (2 putaran penuh = 720 derajat)
    // Sesuaikan nilai 720 untuk mengubah kecepatan rotasi:
    // - Nilai lebih besar = putaran lebih cepat
    // - Nilai lebih kecil = putaran lebih lambat
    // Contoh:
    // - 360 = 1 putaran penuh
    // - 720 = 2 putaran penuh
    // - 1080 = 3 putaran penuh
    // - 1440 = 4 putaran penuh (lebih cepat)
    const rotation = interpolate(
        frame,
        [4, durationInFrames],
        [0, 1440], // Mengubah ke 4 putaran penuh untuk rotasi lebih cepat
        {
            extrapolateRight: "clamp"
        }
    )

    // Tambahkan fungsi untuk mendapatkan posisi bar sebelumnya
    const getPreviousValue = (playerName: string) => {
        const prevIndex = Math.max(0, currentIndex - 1)
        const prevData = keyframes[prevIndex]
        return prevData ? Number(prevData[playerName]) || 0 : 0
    }

    // Tambahkan fungsi untuk mendapatkan posisi bar sebelumnya
    const getPreviousRank = (playerName: string) => {
        const prevIndex = Math.max(0, currentIndex - 1)
        const prevData = keyframes[prevIndex]
        if (!prevData) return items.length // Return max rank jika tidak ada data sebelumnya
        
        const prevItems = Object.entries(prevData)
            .filter(([key]) => key !== 'year' && key !== 'month')
            .map(([name, value]) => ({name, value: Number(value) || 0}))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value)
        
        const rank = prevItems.findIndex(item => item.name === playerName)
        return rank === -1 ? items.length : rank
    }

    return (
        <div style={{
            padding: CONFIG.CONTAINER_PADDING,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#fff',
            overflow: 'hidden',
            fontFamily: fontFamily
        }}>
            {/* Static Title Section */}
            <div style={{
                position: 'absolute',
                right: CONFIG.RIGHT_MARGIN + 20,
                bottom: TIMELINE_CONFIG.HEIGHT + 60,
                textAlign: 'right',
                opacity: 0.5,
                zIndex: 1
            }}>
                {/* Year and Month display */}
                <div style={{
                    fontSize: CONFIG.DATE_FONT_SIZE,
                    color: '#000',
                    fontWeight: 'bold',
                    marginBottom: 10
                }}>
                    {currentData.year}/{String(currentData.month).padStart(2, '0')}
                </div>

                <div style={{
                    fontSize: 48,
                    fontWeight: 'bold',
                    color: '#000',
                    lineHeight: 1.2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '10px'
                }}>
                    La Liga 
                    <Img
                        src="https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/es.svg"
                        style={{
                            width: '48px',
                            height: 'auto',
                            display: 'inline-block',
                            verticalAlign: 'middle'
                        }}
                    />
                </div>
                <div style={{
                    fontSize: 32,
                    color: '#333',
                    marginTop: 5
                }}>
                    All-Time Assists
                </div>
            </div>

            {/* Bar chart content */}
            <div style={{
                position: 'relative',
                height: `calc(100% - ${TIMELINE_CONFIG.HEIGHT}px)`,
                overflow: 'visible',
                marginLeft: CONFIG.LEFT_MARGIN,
                marginRight: CONFIG.RIGHT_MARGIN
            }}>
                {/* Watermark */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '60%',
                    transform: 'translate(-50%, -50%) rotate(-30deg)',
                    fontSize: '60px',
                    fontWeight: 'bold',
                    color: '#000',
                    opacity: 0.03,
                    whiteSpace: 'nowrap',
                    zIndex: 0,
                    pointerEvents: 'none',
                    userSelect: 'none',
                    textTransform: 'uppercase',
                    letterSpacing: '10px'
                }}>
                    Dango Ball
                </div>

                {/* Background horizontal lines */}
                {[...Array(6)].map((_, i) => (
                    <div
                        key={`line-${i}`}
                        style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: `${(i + 1) * (100 / 6)}%`,
                            height: '1px',
                            backgroundColor: '#eee',
                            zIndex: 0
                        }}
                    />
                ))}

                {/* Dynamic vertical lines based on maxValue */}
                {[0.25, 0.5, 0.75].map((ratio) => {
                    const value = Math.round(maxValue * ratio);
                    const position = (value / maxValue) * CONFIG.MAX_BAR_WIDTH;
                    
                    return (
                        <div key={`vline-${ratio}`}>
                            {/* Vertical line */}
                            <div style={{
                                position: 'absolute',
                                left: `${position}px`,
                                top: 0,
                                bottom: 0,
                                width: '1px',
                                backgroundColor: '#eee',
                                zIndex: 0
                            }} />
                            {/* Value label */}
                            <div style={{
                                position: 'absolute',
                                left: `${position}px`,
                                top: -20,
                                transform: 'translateX(-50%)',
                                fontSize: '19px',
                                color: '#666',
                                zIndex: 0
                            }}>
                                {numberWithCommas(value)}
                            </div>
                        </div>
                    );
                })}

                {items.map((item, i) => {
                    // Hitung arah pergerakan (naik/turun)
                    const previousRank = getPreviousRank(item.name);
                    const currentRank = i;
                    const isMovingDown = currentRank > previousRank;

                    // Gunakan spring config yang berbeda untuk gerakan turun
                    const springConfig = isMovingDown ? FALLING_CONFIG.spring : ANIMATION_CONFIG.spring;

                    // Spring animation untuk posisi vertikal
                    const verticalSpring = spring({
                        frame: frame,
                        fps,
                        config: springConfig
                    });

                    const yPosition = interpolate(
                        verticalSpring,
                        [0, 1],
                        [previousRank * 50, currentRank * 50],
                        {
                            easing: isMovingDown ? Easing.bounceOut : ANIMATION_CONFIG.entry.easing
                        }
                    );

                    // Spring animation untuk width bar - lebih halus
                    const previousValue = getPreviousValue(item.name)
                    const targetWidth = (item.value / maxValue) * CONFIG.MAX_BAR_WIDTH
                    const previousWidth = (previousValue / maxValue) * CONFIG.MAX_BAR_WIDTH
                    
                    const widthSpring = spring({
                        frame: frame,
                        fps,
                        config: {
                            damping: 25,    // Lebih tinggi untuk perubahan width yang lebih stabil
                            mass: 1.5,      // Lebih berat untuk mengurangi fluktuasi
                            stiffness: 70,  // Lebih rendah untuk transisi lebih lambat
                            overshootClamping: false
                        }
                    })

                    // Entry animation dengan timing yang lebih baik
                    const entryStartFrame = currentIndex * FRAMES_PER_DATA + (i * ANIMATION_CONFIG.entry.delay)
                    const entryProgress = interpolate(
                        frame - entryStartFrame,
                        [0, ANIMATION_CONFIG.entry.duration],
                        [0, 1],
                        {
                            extrapolateLeft: 'clamp',
                            extrapolateRight: 'clamp',
                            easing: ANIMATION_CONFIG.entry.easing
                        }
                    )

                    // Interpolate width dengan spring yang lebih smooth
                    const interpolatedWidth = interpolate(
                        widthSpring,
                        [0, 1],
                        [previousWidth, targetWidth],
                        {
                            easing: ANIMATION_CONFIG.entry.easing
                        }
                    )

                    return (
                        <div
                            key={item.name}
                            style={{
                                position: 'absolute',
                                top: yPosition,
                                left: 0,
                                display: 'flex',
                                alignItems: 'center',
                                height: CONFIG.BAR_HEIGHT,
                                width: `calc(100% - ${CONFIG.LEFT_MARGIN + CONFIG.RIGHT_MARGIN}px)`,
                                transform: `translateY(${yPosition}px)`,
                                transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)'
                            }}
                        >
                            <div
                                style={{
                                    width: `${interpolatedWidth}px`,
                                    minWidth: '60px',
                                    height: CONFIG.BAR_HEIGHT - 5,
                                    backgroundColor: getPlayerColor(item.name),
                                    display: 'flex',
                                    alignItems: 'center',
                                    paddingLeft: '15px',
                                    position: 'relative',
                                    borderLeft: '4px solid rgba(0, 0, 0, 0.2)',
                                    borderRadius: '0 15px 15px 0',
                                    transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)'
                                }}
                            >

                                <span style={{
                                    color: '#fff',
                                    fontSize: CONFIG.FONT_SIZE,
                                    fontWeight: 'bolder',
                                    textShadow: `
                                        -1px -1px 0 rgba(0,0,0,0.10),
                                        1px -1px 0 rgba(0,0,0,0.10),
                                        -1px 1px 0 rgba(0,0,0,0.10),
                                        1px 1px 0 rgba(0,0,0,0.10)
                                    `,
                                    backgroundColor: 'rgba(0,0,0,0.1)',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    display: 'inline-block'
                                }}>
                                    {item.name}
                                </span>
                                
                                <span style={{
                                    color: '#fff',
                                    fontSize: CONFIG.VALUE_FONT_SIZE,
                                    fontWeight: 'bolder',
                                    position: 'absolute',
                                    right: '15px',
                                    textShadow: `
                                        -1px -1px 0 rgba(0,0,0,0.0),
                                        1px -1px 0 rgba(0,0,0,0.1),
                                        -1px 1px 0 rgba(0,0,0,0.0),
                                        1px 1px 0 rgba(0,0,0,0.1)
                                    `,
                                    backgroundColor: 'rgba(0,0,0,0.0)',
                                    padding: '4px 8px',
                                    borderRadius: '4px'
                                }}>
                                    {numberWithCommas(item.value)}
                                </span>

                                {/* Player Photo */}
                                <div style={{
                                    position: 'absolute',
                                    right: -90,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    border: '3px solid #000',
                                    overflow: 'hidden',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }}>
                                    <Img
                                        src={getPlayerProfile(item.name)}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                        }}
                                        loading="eager"
                                    />
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Timeline dengan struktur yang lebih baik */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: TIMELINE_CONFIG.LEFT_MARGIN,
                right: TIMELINE_CONFIG.RIGHT_MARGIN,
                height: TIMELINE_CONFIG.HEIGHT,
                backgroundColor: TIMELINE_CONFIG.BACKGROUND,
                display: 'flex',
                alignItems: 'center',
                padding: `0 ${TIMELINE_CONFIG.PADDING}px`,
                zIndex: 1
            }}>
                {/* Garis timeline */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: TIMELINE_CONFIG.PADDING,
                    right: TIMELINE_CONFIG.PADDING,
                    height: '2px',
                    backgroundColor: '#666',
                    transform: 'translateY(-50%)'
                }} />

                {/* Emoji bola yang berputar - sesuaikan posisinya */}
                <div style={{
                    position: 'absolute',
                    left: `${(frame / durationInFrames * 100)}%`,
                    top: '50%',
                    fontSize: '24px',
                    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                    zIndex: 2
                }}>
                    ⚽
                </div>

                {/* Tahun dan bulan saat ini - sesuaikan posisinya */}
                <div style={{
                    position: 'absolute',
                    left: `${(frame / durationInFrames * 100)}%`,
                    bottom: '100%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'transparent', // #e91e63
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: TIMELINE_CONFIG.FONT_SIZE,
                    fontWeight: 'bold',
                    color: '#000',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    {currentData.year}/{String(currentData.month).padStart(2, '0')}
                </div>

                {/* Ticks dan labels tahun dengan posisi yang disesuaikan */}
                {keyframes
                    .filter((data, i) => i % (12 * TIMELINE_CONFIG.YEAR_GAP) === 0)
                    .map((data, i, arr) => {
                        const position = (i / (arr.length - 1)) * 100;
                        // Hanya render jika dalam area yang aman (5% dari tepi)
                        if (position >= 5 && position <= 95) {
                            return (
                                <div
                                    key={i}
                                    style={{
                                        position: 'absolute',
                                        left: `${position}%`,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center'
                                    }}
                                >
                                    {/* Tick mark */}
                                    <div style={{
                                        width: '2px',
                                        height: TIMELINE_CONFIG.TICK_HEIGHT,
                                        backgroundColor: '#666'
                                    }} />
                                    {/* Label tahun */}
                                    <div style={{
                                        marginTop: TIMELINE_CONFIG.LABEL_OFFSET,
                                        fontSize: TIMELINE_CONFIG.FONT_SIZE,
                                        color: '#666',
                                        backgroundColor: TIMELINE_CONFIG.LABEL_BACKGROUND,
                                        padding: TIMELINE_CONFIG.LABEL_PADDING,
                                        borderRadius: '9px',
                                        fontWeight: 'bold'
                                    }}>
                                        {String(data.year).slice(-2)}
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })}
            </div>
        </div>
    )
}

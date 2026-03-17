import React from 'react'
import Svg, { Polygon } from 'react-native-svg'
import { colors } from '../theme'

interface HourglassIconProps {
  size?: number
  color?: string
}

export function HourglassIcon({ size = 36, color = colors.accent }: HourglassIconProps) {
  // Two triangles forming a bowtie/hourglass X shape
  // Triangles extend to the edges with a tight pinch at center
  const s = size
  const pad = s * 0.02 // minimal padding from edge

  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      {/* Left triangle: top-left corner → center → bottom-left corner */}
      <Polygon
        points={`${pad},${pad} ${s / 2},${s / 2} ${pad},${s - pad}`}
        fill={color}
      />
      {/* Right triangle: top-right corner → center → bottom-right corner */}
      <Polygon
        points={`${s - pad},${pad} ${s / 2},${s / 2} ${s - pad},${s - pad}`}
        fill={color}
      />
    </Svg>
  )
}

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
      {/* Top triangle: top-left → top-right → center */}
      <Polygon
        points={`${pad},${pad} ${s - pad},${pad} ${s / 2},${s / 2}`}
        fill={color}
      />
      {/* Bottom triangle: bottom-left → bottom-right → center */}
      <Polygon
        points={`${pad},${s - pad} ${s - pad},${s - pad} ${s / 2},${s / 2}`}
        fill={color}
      />
    </Svg>
  )
}

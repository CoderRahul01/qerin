"use client";

import { useId, useState } from "react";
import { TIMEFRAME_CHART_DATA } from "../lib/data";
import { Timeframe } from "../lib/types";

interface ChartSectionProps {
  currentRevenue: number;
}

export function ChartSection({ currentRevenue }: ChartSectionProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("24H");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const gradientId = useId();

  const data = TIMEFRAME_CHART_DATA[timeframe] || TIMEFRAME_CHART_DATA["24H"];
  const points = data.values;
  const labels = data.labels;

  const minVal = Math.min(...points) * 0.94;
  const maxVal = Math.max(...points) * 1.04 || 1;

  const width = 340;
  const height = 140;
  const paddingX = 4;
  const paddingY = 16;

  const chartPoints = points.map((val, idx) => {
    const x = paddingX + (idx / (points.length - 1)) * (width - paddingX * 2);
    const y = height - paddingY - ((val - minVal) / (maxVal - minVal)) * (height - paddingY * 2);
    return { x, y, val, label: labels[idx] };
  });

  // Smooth SVG curve
  const pathD = chartPoints.reduce((acc, curr, idx, arr) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    const prev = arr[idx - 1];
    const cpx1 = prev.x + (curr.x - prev.x) / 2;
    const cpy1 = prev.y;
    const cpx2 = prev.x + (curr.x - prev.x) / 2;
    const cpy2 = curr.y;
    return `${acc} C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${curr.x} ${curr.y}`;
  }, "");

  const areaD = `${pathD} L ${chartPoints[chartPoints.length - 1].x} ${height} L ${chartPoints[0].x} ${height} Z`;

  const activePoint = hoverIndex !== null ? chartPoints[hoverIndex] : chartPoints[chartPoints.length - 1];
  const displayedValue = activePoint ? activePoint.val.toFixed(2) : currentRevenue.toFixed(2);
  const activePercent = hoverIndex !== null ? ((activePoint.val / points[0] - 1) * 100).toFixed(1) : data.changePct.toFixed(1);

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = e.clientX - rect.left;
    const scaleX = width / rect.width;
    const svgX = touchX * scaleX;

    let closestIdx = 0;
    let minDiff = Infinity;
    chartPoints.forEach((p, idx) => {
      const diff = Math.abs(p.x - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    setHoverIndex(closestIdx);
  };

  const handlePointerLeave = () => {
    setHoverIndex(null);
  };

  const timeframes: Timeframe[] = ["24H", "7D", "30D", "ALL"];
  const displayTimeframes = ["24H", "1W", "1M", "3M", "6M", "YTD", "1Y"];

  return (
    <>
      {/* Hero Metric Section (Public.com Big Typo + Change Pill) */}
      <section className="hero-price-section">
        <div className="hero-price-row">
          <span className="hero-price-number">${displayedValue}</span>
          <span className="hero-currency-tag">USD</span>
        </div>
        <div className="hero-delta-row">
          <div className="hero-gain-pill">
            <span className="material-symbols-outlined" style={{ fontSize: "14px", fontWeight: "bold" }}>
              arrow_outward
            </span>
            <span>+$0.52 (100% On-Chain)</span>
          </div>
          <span className="hero-today-tag">
            {hoverIndex !== null ? activePoint.label : "Today"}
          </span>
        </div>
      </section>

      {/* Interactive Performance Chart Card */}
      <section className="chart-card-wrapper">
        <div className="chart-svg-area">
          {/* Active scrub line & tooltip */}
          {activePoint && (
            <div
              className="chart-scrub-line"
              style={{
                left: `${(activePoint.x / width) * 100}%`,
              }}
            >
              <div className="chart-scrub-chip">
                ${activePoint.val.toFixed(2)}
              </div>
              <div
                className="chart-scrub-dot"
                style={{
                  marginTop: `${Math.max(0, activePoint.y - 12)}px`,
                }}
              />
            </div>
          )}

          <svg
            viewBox={`0 0 ${width} ${height}`}
            style={{ width: "100%", height: "100%", overflow: "visible" }}
            preserveAspectRatio="none"
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Baseline Reference Lines */}
            <line stroke="var(--border-subtle)" strokeDasharray="4 4" strokeWidth="1" x1="0" x2={width} y1="120" y2="120" />
            <line stroke="var(--border-subtle)" strokeDasharray="2 4" strokeWidth="0.75" x1="0" x2={width} y1="65" y2="65" />

            {/* Gradient Area under curve */}
            <path d={areaD} fill={`url(#${gradientId})`} />

            {/* Main Signature Public.com Green Trendline */}
            <path
              className="chart-path"
              d={pathD}
              fill="none"
              stroke="#00C805"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.6"
            />
          </svg>
        </div>

        {/* Timeframe Filter Pill Selector */}
        <div className="timeframe-bar">
          <div className="timeframe-pills-scroll">
            {displayTimeframes.map((tf) => {
              const mappedTf: Timeframe = tf === "1W" ? "7D" : tf === "1M" ? "30D" : tf === "YTD" || tf === "1Y" ? "ALL" : "24H";
              const isActive = (timeframe === "24H" && tf === "24H") ||
                               (timeframe === "7D" && tf === "1W") ||
                               (timeframe === "30D" && tf === "1M") ||
                               (timeframe === "ALL" && tf === "1Y");

              return (
                <button
                  key={tf}
                  type="button"
                  className={`timeframe-pill-btn ${isActive ? "active" : ""}`}
                  onClick={() => {
                    setTimeframe(mappedTf);
                    setHoverIndex(null);
                  }}
                >
                  {tf}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="header-icon-btn"
            style={{ width: 28, height: 28 }}
            title="Chart Display Settings"
            onClick={() => alert("Chart timescale synced live with on-chain block receipts.")}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
              settings
            </span>
          </button>
        </div>
      </section>
    </>
  );
}

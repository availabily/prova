'use client'

/**
 * components/ArgumentGraph.tsx
 *
 * Interactive D3 force-directed argument graph.
 * Renders the logical dependency structure of a reasoning chain.
 *
 * Node colours:
 *   premise    → dim (#6B7280)
 *   claim      → text (#E8E8E8)
 *   conclusion → verdict colour (green/red)
 *
 * Affected nodes/edges (from failure.affected_nodes) are highlighted in red.
 */

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { ArgumentGraph, FailureDetail, GraphNode, GraphEdge } from '@/lib/api'

interface Props {
  graph: ArgumentGraph
  verdict: 'VALID' | 'INVALID'
  failure?: FailureDetail | null
  height?: number
}

export default function ArgumentGraphViz({
  graph,
  verdict,
  failure,
  height = 320,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !graph.nodes.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth || 600
    const H = height

    const affectedNodeIds = new Set(failure?.affected_nodes ?? [])
    const affectedEdgeKeys = new Set(
      (failure?.affected_edges ?? []).map((e) => `${e.from}__${e.to}`)
    )

    // ── Colour helpers ─────────────────────────────────────────────
    const nodeColor = (n: GraphNode) => {
      if (affectedNodeIds.has(n.id)) return '#EF4444'
      if (n.type === 'premise')    return '#3A3A3A'
      if (n.type === 'conclusion') return verdict === 'VALID' ? '#22C55E' : '#EF4444'
      return '#E8E8E8'
    }

    const edgeColor = (e: GraphEdge) =>
      affectedEdgeKeys.has(`${e.from}__${e.to}`) ? '#EF4444' : '#3A3A3A'

    // ── Build simulation data ──────────────────────────────────────
    const nodes = graph.nodes.map((n) => ({ ...n, x: width / 2, y: H / 2 }))
    const nodeById = new Map(nodes.map((n) => [n.id, n]))

    const links = graph.edges
      .map((e) => ({
        source: nodeById.get(e.from)!,
        target: nodeById.get(e.to)!,
        ...e,
      }))
      .filter((l) => l.source && l.target)

    // ── SVG setup ──────────────────────────────────────────────────
    svg.attr('viewBox', `0 0 ${width} ${H}`)

    // Arrow markers
    const defs = svg.append('defs')

    const markerFor = (id: string, color: string) => {
      defs.append('marker')
        .attr('id', id)
        .attr('viewBox', '0 -4 8 8')
        .attr('refX', 18)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-4L8,0L0,4')
        .attr('fill', color)
    }

    markerFor('arrow-normal',   '#3A3A3A')
    markerFor('arrow-affected', '#EF4444')

    // ── Force simulation ───────────────────────────────────────────
    const sim = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(110).strength(0.8))
      .force('charge', d3.forceManyBody().strength(-320))
      .force('center', d3.forceCenter(width / 2, H / 2))
      .force('collision', d3.forceCollide(36))

    // ── Draw edges ─────────────────────────────────────────────────
    const edgeGroup = svg.append('g').attr('class', 'edges')

    const edgeLines = edgeGroup
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d: any) => edgeColor(d))
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.8)
      .attr('marker-end', (d: any) =>
        affectedEdgeKeys.has(`${d.from}__${d.to}`)
          ? 'url(#arrow-affected)'
          : 'url(#arrow-normal)'
      )

    // ── Draw nodes ─────────────────────────────────────────────────
    const nodeGroup = svg.append('g').attr('class', 'nodes')

    const nodeCircles = nodeGroup
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(
        d3.drag<any, any>()
          .on('start', (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart()
            d.fx = d.x; d.fy = d.y
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
          .on('end', (event, d) => {
            if (!event.active) sim.alphaTarget(0)
            d.fx = null; d.fy = null
          })
      )

    // Node circle
    nodeCircles
      .append('circle')
      .attr('r', 10)
      .attr('fill', (d) => nodeColor(d as any))
      .attr('fill-opacity', (d: any) => d.type === 'premise' ? 0.9 : 1)
      .attr('stroke', (d) => nodeColor(d as any))
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.4)

    // Node label (truncated)
    nodeCircles
      .append('text')
      .text((d) => truncate((d as any).text ?? (d as any).id, 28))
      .attr('dy', 24)
      .attr('text-anchor', 'middle')
      .attr('fill', '#6B7280')
      .attr('font-size', '9px')
      .attr('font-family', 'JetBrains Mono, monospace')

    // Node type badge
    nodeCircles
      .append('text')
      .text((d: any) => d.type?.[0]?.toUpperCase() ?? '?')
      .attr('dy', 4)
      .attr('text-anchor', 'middle')
      .attr('fill', '#0A0A0A')
      .attr('font-size', '8px')
      .attr('font-weight', '700')
      .attr('font-family', 'JetBrains Mono, monospace')

    // Tooltip on hover
    const tooltip = d3.select('body')
      .selectAll('.prova-tooltip')
      .data([null])
      .join('div')
      .attr('class', 'prova-tooltip')
      .style('position', 'fixed')
      .style('background', '#111111')
      .style('border', '1px solid #1F1F1F')
      .style('border-radius', '4px')
      .style('padding', '8px 12px')
      .style('font-family', 'JetBrains Mono, monospace')
      .style('font-size', '11px')
      .style('color', '#E8E8E8')
      .style('pointer-events', 'none')
      .style('opacity', '0')
      .style('z-index', '9999')
      .style('max-width', '260px')
      .style('line-height', '1.5')

    nodeCircles
      .on('mouseenter', (event, d: any) => {
        tooltip
          .html(`<span style="color:#6B7280">${d.type}</span><br/>${d.text ?? d.id}`)
          .style('opacity', '1')
          .style('left', `${event.clientX + 14}px`)
          .style('top', `${event.clientY - 10}px`)
      })
      .on('mousemove', (event) => {
        tooltip
          .style('left', `${event.clientX + 14}px`)
          .style('top', `${event.clientY - 10}px`)
      })
      .on('mouseleave', () => {
        tooltip.style('opacity', '0')
      })

    // ── Tick ───────────────────────────────────────────────────────
    sim.on('tick', () => {
      edgeLines
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      nodeCircles.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })

    return () => {
      sim.stop()
      d3.selectAll('.prova-tooltip').remove()
    }
  }, [graph, verdict, failure, height])

  if (!graph.nodes.length) {
    return (
      <div
        className="graph-canvas flex items-center justify-center text-dim mono text-xs"
        style={{ height }}
      >
        no graph data
      </div>
    )
  }

  return (
    <div className="graph-canvas relative" style={{ height }}>
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        className="block"
      />
      <div className="absolute bottom-3 left-3 flex gap-3 text-xs mono text-dim">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-muted" />
          premise
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-text" />
          claim
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: verdict === 'VALID' ? '#22C55E' : '#EF4444' }}
          />
          conclusion
        </span>
      </div>
    </div>
  )
}

function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n - 1) + '…' : str
}

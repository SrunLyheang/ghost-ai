import type { Edge, Node } from "@xyflow/react"

/** Node body shape rendered on the canvas. */
export type CanvasNodeShape =
  | "rectangle"
  | "diamond"
  | "circle"
  | "pill"
  | "cylinder"
  | "hexagon"

/** Default fill/border color for a freshly dropped node (`--accent-primary`). */
export const DEFAULT_NODE_COLOR = "#00c8d4"

/** Default width/height per shape, used as the shape-panel drag payload size. */
export const SHAPE_DEFAULT_SIZE: Record<
  CanvasNodeShape,
  { width: number; height: number }
> = {
  rectangle: { width: 160, height: 80 },
  diamond: { width: 180, height: 140 },
  circle: { width: 120, height: 120 },
  pill: { width: 160, height: 64 },
  cylinder: { width: 120, height: 120 },
  hexagon: { width: 160, height: 100 },
}

/** `dataTransfer` MIME type for a shape dragged from the bottom panel. */
export const SHAPE_DRAG_TYPE = "application/x-canvas-shape"

/** Payload serialized into `dataTransfer` while dragging a shape. */
export interface ShapeDragPayload {
  shape: CanvasNodeShape
  width: number
  height: number
}

/** Data carried by every canvas node. */
export interface CanvasNodeData {
  label: string
  color: string
  shape: CanvasNodeShape
  // React Flow requires node data to be an index-signature record.
  [key: string]: unknown
}

/** Data carried by every canvas edge. */
export type CanvasEdgeData = Record<string, unknown>

/** Custom node/edge type keys used across the canvas. */
export const CANVAS_NODE_TYPE = "canvasNode"
export const CANVAS_EDGE_TYPE = "canvasEdge"

export type CanvasNode = Node<CanvasNodeData, typeof CANVAS_NODE_TYPE>
export type CanvasEdge = Edge<CanvasEdgeData, typeof CANVAS_EDGE_TYPE>

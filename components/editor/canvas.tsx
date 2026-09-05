"use client"

import { Component, useCallback, useRef, type DragEvent, type ReactNode } from "react"

import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Handle,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react"
import {
  Circle,
  Cylinder,
  Diamond,
  Hexagon,
  Pill,
  RectangleHorizontal,
  type LucideIcon,
} from "lucide-react"

import {
  CANVAS_NODE_TYPE,
  DEFAULT_NODE_COLOR,
  SHAPE_DEFAULT_SIZE,
  SHAPE_DRAG_TYPE,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeShape,
  type ShapeDragPayload,
} from "@/types/canvas"

import "@xyflow/react/dist/style.css"
import "@liveblocks/react-flow/styles.css"

interface CanvasRoomProps {
  /** Liveblocks room ID — equal to the project ID. */
  roomId: string
}

/** Sets up the Liveblocks room for a project and renders the collaborative canvas. */
function CanvasRoom({ roomId }: CanvasRoomProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null, isThinking: false }}
      >
        <CanvasErrorBoundary>
          <ClientSideSuspense
            fallback={<CanvasMessage>Loading canvas…</CanvasMessage>}
          >
            <ReactFlowProvider>
              <Canvas />
            </ReactFlowProvider>
          </ClientSideSuspense>
        </CanvasErrorBoundary>
      </RoomProvider>
    </LiveblocksProvider>
  )
}

/** SVG outline per shape, stretched to the node box via `preserveAspectRatio="none"`.
 *  Stroke stays crisp with `vector-effect="non-scaling-stroke"`. */
function ShapeOutline({ shape, color }: { shape: CanvasNodeShape; color: string }) {
  const common = {
    fill: color,
    fillOpacity: 0.08,
    stroke: color,
    strokeWidth: 2,
    vectorEffect: "non-scaling-stroke" as const,
  }
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {shape === "rectangle" && <rect x={1} y={1} width={98} height={98} rx={6} {...common} />}
      {shape === "pill" && <rect x={1} y={1} width={98} height={98} rx={49} ry={49} {...common} />}
      {shape === "circle" && <ellipse cx={50} cy={50} rx={49} ry={49} {...common} />}
      {shape === "diamond" && <polygon points="50,1 99,50 50,99 1,50" {...common} />}
      {shape === "hexagon" && (
        <polygon points="25,1 75,1 99,50 75,99 25,99 1,50" {...common} />
      )}
      {shape === "cylinder" && (
        <>
          <path d="M1,13 A49,12 0 0 1 99,13 L99,87 A49,12 0 0 1 1,87 Z" {...common} />
          <path d="M1,13 A49,12 0 0 0 99,13" {...common} fill="none" />
        </>
      )}
    </svg>
  )
}

/** Renders a dropped node using its shape outline with the label centered. */
function CanvasNodeView({ data }: NodeProps<CanvasNode>) {
  return (
    <div className="relative flex h-full w-full items-center justify-center px-3 py-2 text-center text-xs text-copy-primary">
      <ShapeOutline shape={data.shape} color={data.color} />
      <Handle type="target" position={Position.Top} />
      <span className="relative">{data.label}</span>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

const nodeTypes: NodeTypes = { [CANVAS_NODE_TYPE]: CanvasNodeView }

const SHAPE_ICONS: Record<CanvasNodeShape, LucideIcon> = {
  rectangle: RectangleHorizontal,
  diamond: Diamond,
  circle: Circle,
  pill: Pill,
  cylinder: Cylinder,
  hexagon: Hexagon,
}

/** Bottom-center pill toolbar of draggable shapes. */
function ShapePanel({
  onCreate,
}: {
  onCreate: (shape: CanvasNodeShape) => void
}) {
  const onDragStart = (event: DragEvent, shape: CanvasNodeShape) => {
    const payload: ShapeDragPayload = { shape, ...SHAPE_DEFAULT_SIZE[shape] }
    event.dataTransfer.setData(SHAPE_DRAG_TYPE, JSON.stringify(payload))
    event.dataTransfer.effectAllowed = "move"
  }

  return (
    <Panel position="bottom-center">
      <div className="flex items-center gap-1 rounded-full border border-surface-border bg-surface px-2 py-1.5 shadow-lg">
        {(Object.keys(SHAPE_ICONS) as CanvasNodeShape[]).map((shape) => {
          const Icon = SHAPE_ICONS[shape]
          return (
            <button
              key={shape}
              type="button"
              draggable
              onDragStart={(event) => onDragStart(event, shape)}
              onClick={() => onCreate(shape)}
              title={shape}
              aria-label={`Add ${shape} to the canvas`}
              className="flex h-8 w-8 cursor-grab items-center justify-center rounded-full text-copy-muted transition-colors hover:bg-elevated hover:text-copy-primary active:cursor-grabbing"
            >
              <Icon className="h-4 w-4" />
            </button>
          )
        })}
      </div>
    </Panel>
  )
}

/** React Flow surface wired to Liveblocks-synced nodes and edges. */
function Canvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    })
  const { screenToFlowPosition } = useReactFlow()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const dropCounter = useRef(0)

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const addShape = useCallback(
    (payload: ShapeDragPayload, position: { x: number; y: number }) => {
      const id = `${payload.shape}-${Date.now()}-${dropCounter.current++}`
      const node: CanvasNode = {
        id,
        type: CANVAS_NODE_TYPE,
        position,
        width: payload.width,
        height: payload.height,
        data: { label: "", color: DEFAULT_NODE_COLOR, shape: payload.shape },
      }
      onNodesChange([{ type: "add", item: node }])
    },
    [onNodesChange],
  )

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()
      const raw = event.dataTransfer.getData(SHAPE_DRAG_TYPE)
      if (!raw) return

      let payload: ShapeDragPayload
      try {
        payload = JSON.parse(raw) as ShapeDragPayload
      } catch {
        return
      }

      addShape(
        payload,
        screenToFlowPosition({ x: event.clientX, y: event.clientY }),
      )
    },
    [screenToFlowPosition, addShape],
  )

  /** Drops the shape at the center of the canvas viewport (keyboard / click path). */
  const createShapeAtCenter = useCallback(
    (shape: CanvasNodeShape) => {
      const rect = wrapperRef.current?.getBoundingClientRect()
      if (!rect) return
      addShape(
        { shape, ...SHAPE_DEFAULT_SIZE[shape] },
        screenToFlowPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        }),
      )
    },
    [screenToFlowPosition, addShape],
  )

  return (
    <div
      ref={wrapperRef}
      className="h-full w-full"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
        connectionMode={ConnectionMode.Loose}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <MiniMap />
        <ShapePanel onCreate={createShapeAtCenter} />
      </ReactFlow>
    </div>
  )
}

function CanvasMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background px-6 text-center text-sm text-copy-muted">
      {children}
    </div>
  )
}

/** Fallback for Liveblocks connection / room errors. */
class CanvasErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <CanvasMessage>
          Couldn’t connect to the collaborative canvas. Refresh to try again.
        </CanvasMessage>
      )
    }
    return this.props.children
  }
}

export { CanvasRoom }

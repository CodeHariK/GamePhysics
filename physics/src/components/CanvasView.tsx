import { onMount, onCleanup, createSignal, Show, type Component, type JSX } from 'solid-js';
import { Canvas } from '../lib/render/Canvas';

interface CanvasViewProps {
  width: number;
  height: number;
  onReady: (canvas: Canvas) => void;
  onInteraction?: () => void;
  showOverlay?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
}

/**
 * A reusable SolidJS component that encapsulates an HTMLCanvasElement
 * and manages the lifecycle of the custom Canvas rendering engine.
 * Now manages internal viewport state (zoom, pan, isPanning) and UI overlay.
 */
export const CanvasView: Component<CanvasViewProps> = (props) => {
  let canvasRef!: HTMLCanvasElement;
  let canvasInstance: Canvas;

  // Internal viewport state
  const [zoom, setZoom] = createSignal(1.0);
  const [isPanning, setIsPanning] = createSignal(false);

  onMount(() => {
    // Initialize the rendering helper
    canvasInstance = new Canvas(canvasRef);
    
    // Bind zoom/pan interactions
    canvasInstance.initInteractions({
      onInteraction: () => {
        // Sync internal state for reactivity
        setZoom(canvasInstance.zoom);
        setIsPanning(canvasInstance.isPanning);
        
        // Notify parent if needed
        props.onInteraction?.();
      }
    });

    // Notify the parent component that the canvas is ready
    props.onReady(canvasInstance);
  });

  onCleanup(() => {
    if (canvasInstance) {
      canvasInstance.destroyInteractions();
    }
  });

  return (
    <div style={{ position: "relative", ...props.style }}>
        <canvas
            ref={canvasRef!}
            width={props.width}
            height={props.height}
            class={props.class}
            style={{
                "touch-action": "none",
                "cursor": isPanning() ? "grabbing" : (props.style?.cursor || "crosshair"),
                "display": "block",
                "max-width": "100%",
                "height": "auto",
                "border-radius": "inherit"
            }}
        />
        <Show when={props.showOverlay !== false}>
            <div style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "rgba(0,0,0,0.5)",
                padding: "5px 10px",
                "border-radius": "4px",
                "font-size": "11px",
                color: "#ccc",
                "pointer-events": "none",
                "font-family": "'JetBrains Mono', monospace"
            }}>
                ZOOM: {zoom().toFixed(1)}x (MWHEEL) | PAN: MCLICK DRAG
            </div>
        </Show>
    </div>
  );
};

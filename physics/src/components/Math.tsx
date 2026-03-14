import { onMount } from 'solid-js';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathProps {
    tex?: string;
    formula?: string; // Add formula as alias for forward compatibility
    block?: boolean;
}

export function Math(props: MathProps) {
    let el!: HTMLSpanElement;
    onMount(() => {
        katex.render(props.tex || props.formula || '', el, {
            throwOnError: false,
            displayMode: props.block ?? true
        });
    });
    return <span ref={el} />;
}

export function InlineMath(props: { formula: string }) {
    let el!: HTMLSpanElement;
    onMount(() => {
        katex.render(props.formula, el, {
            throwOnError: false,
            displayMode: false
        });
    });
    return <span ref={el} />;
}

export default Math;

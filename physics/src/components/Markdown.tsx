import { createMemo } from 'solid-js';
import { Marked } from 'marked';
import markedKatex from 'marked-katex-extension';
import 'katex/dist/katex.min.css';

const marked = new Marked();
marked.use(markedKatex({
    throwOnError: false,
    displayMode: true,
    nonStandard: true,
}));

interface MarkdownProps {
    content: string;
    class?: string;
}

export default function Markdown(props: MarkdownProps) {
    const html = createMemo(() => {
        const c = props.content || '';
        return marked.parse(c) as string;
    });

    return (
        <div 
            class={props.class} 
            innerHTML={html()} 
            style="line-height: 1.6; color: #ccc;"
        />
    );
}

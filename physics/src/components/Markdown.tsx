import { createMemo } from 'solid-js';
import { Marked } from 'marked';
import markedKatex from 'marked-katex-extension';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';

const marked = new Marked();

marked.use(markedKatex({
    throwOnError: false,
    displayMode: true,
    nonStandard: true,
}));

marked.use(markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang, _info) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
    }
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

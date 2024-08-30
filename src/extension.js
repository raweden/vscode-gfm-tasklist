import { workspace } from 'vscode';
import { taskLists } from './tasklist.js';

export function activate() {
    return { 
        extendMarkdownIt(md) {
            return md.use(() => {
                const config = workspace.getConfiguration('markdown-checkboxes');
                return md.use(taskLists, {
                    enabled: true,
                    label: true,
                    labelAfter: true,
                });
            });
        } 
    };
}
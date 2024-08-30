
// Markdown-it plugin to render GitHub-style task lists; see
//
// https://github.com/blog/1375-task-lists-in-gfm-issues-pulls-comments
// https://github.com/blog/1825-task-lists-in-all-markdown-documents

import Token from "./token";

const checkboxRegex = /^ *\[([\sx])] /i;

/**
 * @typedef {TaskListsOptions}
 * @property {boolean} enabled
 * @property {boolean} label
 * @property {boolean} lineNumber
 * 
 * @param {MarkdownIt} md 
 * @param {TaskListsOptions} options 
 * @return {void}
 */
export function taskLists(md, options) {
    md.core.ruler.after('inline', 'task-lists', (state) => {
        processToken(state, options);
    });
    md.renderer.rules.taskListItemCheckbox = (tokens) => {
        const token = tokens[0];
        const checkedAttribute = token.attrGet('checked') ? 'checked="" ' : '';
        const disabledAttribute = token.attrGet('disabled') ? 'disabled="" ' : '';
        const line = token.attrGet('line');
        const idAttribute = `id="${token.attrGet('id')}" `;
        const dataLineAttribute = line && options.lineNumber ? `data-line="${line}" ` : '';

        return `<input class="task-list-item-checkbox" type="checkbox" disabled ${checkedAttribute}${disabledAttribute}${dataLineAttribute}${idAttribute}/>`;
    };

    md.renderer.rules.taskListItemLabel_close = () => {
        return '</label>';
    };

    md.renderer.rules.taskListItemLabel_open = (tokens) => {
        const token = tokens[0];
        const id = token.attrGet('id');
        return `<label for="${id}">`;
    };

}

/*
export function tasklistBlock(md, options) {
    const isEnableInlineCss = options.isEnableInlineCss ? true : false;
    
    const defaultRender = md.renderer.rules.fence;
    if (!defaultRender) {
        throw new Error("defaultRender is undefined");
    }
    
    md.renderer.rules.fence = (tokens, idx, options, env, self) => {
        const token = tokens[idx];
        const orgInfo = token.info;
        const info = token.info ? String(token.info).trim() : "";
        let parsedFenceInfo;
    
        if (info) {
            parsedFenceInfo = parseInfo(info);
            updateTokenInfo(token, parsedFenceInfo);
        } else {
            parsedFenceInfo = { langName: "", fileName: "", langAttrs: "" };
        }
    
        const rootElement = parse(defaultRender(tokens, idx, options, env, self));
        token.info = orgInfo;
    
        updateElement(rootElement, parsedFenceInfo, isEnableInlineCss);
    
        return rootElement.toString();
    };
}

// tasklist block

function updateElement(element, parsedFenceInfo, isEnableInlineCss) {
    if (parsedFenceInfo.fileName && parsedFenceInfo.langName) {
        addNamedFenceBlockAttr(element, isEnableInlineCss);
  
        addNamedFenceFilenameAtrr(element, parsedFenceInfo.fileName, isEnableInlineCss);
    }
}
  
function addNamedFenceBlockAttr(element, isEnableInlineCss) {
    if (element.firstChild instanceof HTMLElement) {
        const existClass = element.firstChild.getAttribute("class");
    
        if (element.firstChild.getAttribute("class")) {
            element.firstChild.setAttribute(
            "class",
            `${existClass} ${fencBlockName}`
            );
        } else {
            element.firstChild.setAttribute("class", fencBlockName);
        }
    
        if (isEnableInlineCss) {
            element.firstChild.setAttribute("style", defaultStyleOptions.mincbBlock);
        }
    }
}
  
function addNamedFenceFilenameAtrr(element, fileName, isEnableInlineCss) {
    const node = parse(`<div class="${fenceFileName}">${fileName}</div>`);
  
    const firstChild = node.firstChild;
  
    if (firstChild instanceof HTMLElement && isEnableInlineCss) {
        firstChild.setAttribute("style", defaultStyleOptions.mincbName);
    }
  
    if (element.firstChild instanceof HTMLElement) {
        element.firstChild.appendChild(node);
    }
}
  
function parseInfo(info) {
    // https://regex101.com/r/PacPRb/4
    const data = { langName: "", fileName: "", langAttrs: "" };
    const arr = info.split(/(\s+)/g);
    const match = arr[0].match(/^([^:\n]+)?(:([^:\n]*))?([^:\n]*)?$/);
    const langAttrs = arr.slice(2).join("");
    if (match) {
        data.langName = match[1] || "";
        data.fileName = match[3] || "";
        data.langAttrs = langAttrs;
        return data;
    }
  
    return data;
}
  
function updateTokenInfo(token, parsedFenceInfo) {
    if (parsedFenceInfo.langName) {
        token.info = parsedFenceInfo.langName + " " + parsedFenceInfo.langAttrs;
    } else {
        token.info = "";
    }
}
*/
  

// tasklist inline

/**
 * 
 * @returns {boolean}
 */
function processToken(state, options) {
    const allTokens = state.tokens;
    for (let i = 2; i < allTokens.length; i++) {
        if (!isTodoItem(allTokens, i)) {
            continue;
        }

        todoify(allTokens[i], options);
        allTokens[i - 2].attrJoin('class', `task-list-item ${options.enabled ? ' enabled' : ''}`);

        const parentToken = findParentToken(allTokens, i - 2);
        if (parentToken) {
            const classes = parentToken.attrGet('class') ?? '';
            if (!classes.match(/(^| )contains-task-list/)) {
                parentToken.attrJoin('class', 'contains-task-list');
            }
        }
    }
    return false;
}

/**
 * 
 * @param {Token[]} tokens 
 * @param {number} index 
 * @returns {Token|void}
 */
function findParentToken(tokens, index) {
    const targetLevel = tokens[index].level - 1;
    for (let currentTokenIndex = index - 1; currentTokenIndex >= 0; currentTokenIndex--) {
        if (tokens[currentTokenIndex].level === targetLevel) {
            return tokens[currentTokenIndex];
        }
    }
    return undefined;
}

/**
 * 
 * @param {Token[]} tokens 
 * @param {number} index 
 * @returns {boolean}
 */
function isTodoItem(tokens, index) {
    return (isInline(tokens[index]) &&
        isParagraph(tokens[index - 1]) &&
        isListItem(tokens[index - 2]) &&
        startsWithTodoMarkdown(tokens[index]));
}

/**
 * @param {Token} token 
 * @param {TaskListsOptions} options 
 * @returns {void}
 */
function todoify(token, options) {
    if (token.children == null) {
        return;
    }

    const id = generateIdForToken(token);

    token.children.splice(0, 0, createCheckboxToken(token, options.enabled, id));
    token.children[1].content = token.children[1].content.replace(checkboxRegex, '');

    if (options.label) {
        token.children.splice(1, 0, createLabelBeginToken(id));
        token.children.push(createLabelEndToken());
    }
}

/**
 * @param {Token} token 
 * @returns {string}
 */
function generateIdForToken(token) {
    if (token.map) {
        return `task-item-${token.map[0]}`;
    } else {
        return `task-item-${Math.ceil(Math.random() * (10000 * 1000) - 1000)}`;
    }
}

/**
 * @param {Token} token 
 * @param {boolean} enabled 
 * @param {string} id 
 * @returns {Token}
 */
function createCheckboxToken(token, enabled, id) {
    const checkbox = new Token('taskListItemCheckbox', '', 0);
    if (!enabled) {
        checkbox.attrSet('disabled', 'true');
    }
    if (token.map) {
        checkbox.attrSet('line', token.map[0].toString());
    }

    checkbox.attrSet('id', id);

    const checkboxRegexResult = checkboxRegex.exec(token.content);
    const isChecked = checkboxRegexResult?.[1].toLowerCase() === 'x';
    if (isChecked) {
        checkbox.attrSet('checked', 'true');
    }

    return checkbox;
}

/**
 * @param {string} token 
 * @returns {Token}
 */
function createLabelBeginToken(id) {
    const labelBeginToken = new Token('taskListItemLabel_open', '', 1);
    labelBeginToken.attrSet('id', id);
    return labelBeginToken;
}

/**
 * @returns {Token}
 */
function createLabelEndToken() {
    return new Token('taskListItemLabel_close', '', -1);
}

/**
 * @param {Token} token 
 * @returns {boolean}
 */
function isInline(token) {
    return token.type === 'inline';
}

/**
 * @param {Token} token 
 * @returns {boolean}
 */
function isParagraph(token) {
    return token.type === 'paragraph_open';
}

/**
 * @param {Token} token 
 * @returns {boolean}
 */
function isListItem(token) {
    return token.type === 'list_item_open';
}

/**
 * @param {Token} token 
 * @returns {boolean}
 */
function startsWithTodoMarkdown(token) {
    return checkboxRegex.test(token.content);
}
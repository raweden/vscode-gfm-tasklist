'use strict';

var vscode = require('vscode');

// Token class

/**
 * class Token
 **/

/**
 * new Token(type, tag, nesting)
 *
 * Create new token and fill passed properties.
 **/
function Token (type, tag, nesting) {
	/**
	 * Token#type -> String
	 *
	 * Type of the token (string, e.g. "paragraph_open")
	 **/
	this.type     = type;
  
	/**
	 * Token#tag -> String
	 *
	 * html tag name, e.g. "p"
	 **/
	this.tag      = tag;
  
	/**
	 * Token#attrs -> Array
	 *
	 * Html attributes. Format: `[ [ name1, value1 ], [ name2, value2 ] ]`
	 **/
	this.attrs    = null;
  
	/**
	 * Token#map -> Array
	 *
	 * Source map info. Format: `[ line_begin, line_end ]`
	 **/
	this.map      = null;
  
	/**
	 * Token#nesting -> Number
	 *
	 * Level change (number in {-1, 0, 1} set), where:
	 *
	 * -  `1` means the tag is opening
	 * -  `0` means the tag is self-closing
	 * - `-1` means the tag is closing
	 **/
	this.nesting  = nesting;
  
	/**
	 * Token#level -> Number
	 *
	 * nesting level, the same as `state.level`
	 **/
	this.level    = 0;
  
	/**
	 * Token#children -> Array
	 *
	 * An array of child nodes (inline and img tokens)
	 **/
	this.children = null;
  
	/**
	 * Token#content -> String
	 *
	 * In a case of self-closing tag (code, html, fence, etc.),
	 * it has contents of this tag.
	 **/
	this.content  = '';
  
	/**
	 * Token#markup -> String
	 *
	 * '*' or '_' for emphasis, fence string for fence, etc.
	 **/
	this.markup   = '';
  
	/**
	 * Token#info -> String
	 *
	 * Additional information:
	 *
	 * - Info string for "fence" tokens
	 * - The value "auto" for autolink "link_open" and "link_close" tokens
	 * - The string value of the item marker for ordered-list "list_item_open" tokens
	 **/
	this.info     = '';
  
	/**
	 * Token#meta -> Object
	 *
	 * A place for plugins to store an arbitrary data
	 **/
	this.meta     = null;
  
	/**
	 * Token#block -> Boolean
	 *
	 * True for block-level tokens, false for inline tokens.
	 * Used in renderer to calculate line breaks
	 **/
	this.block    = false;
  
	/**
	 * Token#hidden -> Boolean
	 *
	 * If it's true, ignore this element when rendering. Used for tight lists
	 * to hide paragraphs.
	 **/
	this.hidden   = false;
  }
  
  /**
   * Token.attrIndex(name) -> Number
   *
   * Search attribute index by name.
   **/
  Token.prototype.attrIndex = function attrIndex (name) {
	if (!this.attrs) { return -1 }
  
	const attrs = this.attrs;
  
	for (let i = 0, len = attrs.length; i < len; i++) {
	  if (attrs[i][0] === name) { return i }
	}
	return -1
  };
  
  /**
   * Token.attrPush(attrData)
   *
   * Add `[ name, value ]` attribute to list. Init attrs if necessary
   **/
  Token.prototype.attrPush = function attrPush (attrData) {
	if (this.attrs) {
	  this.attrs.push(attrData);
	} else {
	  this.attrs = [attrData];
	}
  };
  
  /**
   * Token.attrSet(name, value)
   *
   * Set `name` attribute to `value`. Override old value if exists.
   **/
  Token.prototype.attrSet = function attrSet (name, value) {
	const idx = this.attrIndex(name);
	const attrData = [name, value];
  
	if (idx < 0) {
	  this.attrPush(attrData);
	} else {
	  this.attrs[idx] = attrData;
	}
  };
  
  /**
   * Token.attrGet(name)
   *
   * Get the value of attribute `name`, or null if it does not exist.
   **/
  Token.prototype.attrGet = function attrGet (name) {
	const idx = this.attrIndex(name);
	let value = null;
	if (idx >= 0) {
	  value = this.attrs[idx][1];
	}
	return value
  };
  
  /**
   * Token.attrJoin(name, value)
   *
   * Join value to existing attribute via space. Or create new attribute if not
   * exists. Useful to operate with token classes.
   **/
  Token.prototype.attrJoin = function attrJoin (name, value) {
	const idx = this.attrIndex(name);
  
	if (idx < 0) {
	  this.attrPush([name, value]);
	} else {
	  this.attrs[idx][1] = this.attrs[idx][1] + ' ' + value;
	}
  };

/*
 * SPDX-FileCopyrightText: 2022 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: MIT
 */


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
function taskLists(md, options) {
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

function activate() {
    return { 
        extendMarkdownIt(md) {
            return md.use(() => {
                vscode.workspace.getConfiguration('markdown-checkboxes');
                return md.use(taskLists, {
                    enabled: true,
                    label: true,
                    labelAfter: true,
                });
                /*return md.use(tasklistBlock, {
                    enabled: true,
                    label: true,
                    labelAfter: true,
                });*/
            });
            /*return md.use(() => {
                const config = workspace.getConfiguration('markdown-checkboxes');
                return md.use(taskList, {
                    enabled: config.get('enable'),
                    label: config.get('label'),
                    labelAfter: config.get('labelAfter')
                });
            });
            */
        } 
    };
}

exports.activate = activate;

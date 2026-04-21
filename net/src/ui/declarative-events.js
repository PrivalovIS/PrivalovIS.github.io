function splitArgs(input) {
    const args = [];
    let current = '';
    let quote = null;

    for (let index = 0; index < input.length; index += 1) {
        const char = input[index];
        if ((char === '"' || char === "'") && input[index - 1] !== '\\') {
            if (quote === char) {
                quote = null;
            } else if (!quote) {
                quote = char;
            }
            current += char;
            continue;
        }

        if (char === ',' && !quote) {
            if (current.trim()) args.push(current.trim());
            current = '';
            continue;
        }

        current += char;
    }

    if (current.trim()) args.push(current.trim());
    return args;
}

function coerceArg(raw, event) {
    if (raw === 'event') return event;
    if (raw === 'null') return null;
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
    if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
        return raw.slice(1, -1);
    }
    return raw;
}

function invokeExpression(expression, element, event, actionHandlers) {
    const normalized = expression.trim().replace(/;$/, '');
    const eventProxy = new Proxy(event, {
        get(target, property) {
            if (property === 'currentTarget') return element;
            return target[property];
        }
    });

    if (!normalized) return;

    if (normalized === 'event.stopPropagation()') {
        eventProxy.stopPropagation();
        return;
    }

    const styleMatch = normalized.match(/^this\.style\.([a-zA-Z]+)\s*=\s*['"]([^'"]+)['"]$/);
    if (styleMatch) {
        element.style[styleMatch[1]] = styleMatch[2];
        return;
    }

    const callMatch = normalized.match(/^([A-Za-z_$][\w$]*)\((.*)\)$/);
    if (!callMatch) return;

    const [, fnName, rawArgs] = callMatch;
    const handler = actionHandlers[fnName];
    if (typeof handler !== 'function') return;

    const args = rawArgs.trim() ? splitArgs(rawArgs).map((arg) => coerceArg(arg, eventProxy)) : [];
    handler(...args);
}

function delegate(documentNode, attributeName, domEventName, actionHandlers) {
    documentNode.addEventListener(domEventName, (event) => {
        const startNode = event.target instanceof Element ? event.target : event.target?.parentElement;
        if (!startNode) return;

        const element = startNode.closest(`[${attributeName}]`);
        if (!element) return;

        const expression = element.getAttribute(attributeName);
        invokeExpression(expression, element, event, actionHandlers);
    });
}

export function initDeclarativeEvents(documentNode, actionHandlers) {
    delegate(documentNode, 'data-click', 'click', actionHandlers);
    delegate(documentNode, 'data-mouseover', 'mouseover', actionHandlers);
    delegate(documentNode, 'data-mouseout', 'mouseout', actionHandlers);
}

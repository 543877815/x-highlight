/**
 * Created by huoguangjin on 19/10/2017.
 */
"use strict";

import { updateStripe } from './preview.js'

const HL_CLASS = 'X_HIGHLIGHTED';
const HL_STYLE = `${HL_CLASS} ${HL_CLASS}_`;

const HL_LIST = [
  { fg: '#fff', bg: '#ff0000' },
  { fg: '#fff', bg: '#ff649f' },
  { fg: '#fff', bg: '#e040fb' },
  { fg: '#fff', bg: '#b388ff' },
  { fg: '#fff', bg: '#3f51b5' },
  { fg: '#fff', bg: '#1976d2' },
  { fg: '#000', bg: '#81d4fa' },
  { fg: '#000', bg: '#00b8d4' },
  { fg: '#000', bg: '#64ffda' },
  { fg: '#000', bg: '#4caf50' },
  { fg: '#000', bg: '#76ff03' },
  { fg: '#000', bg: '#cddc39' },
  { fg: '#000', bg: '#ffff00' },
  { fg: '#000', bg: '#ffca28' },
  { fg: '#fff', bg: '#ff6d00' },
  { fg: '#fff', bg: '#d84315' },
  { fg: '#fff', bg: '#795548' },
  { fg: '#fff', bg: '#9e9e9e' },
  { fg: '#fff', bg: '#607d8b' },
];

let color = 0;

const css = document.createElement('style');
css.type = 'text/css';
let cssText = `.${HL_CLASS} {`
  + 'font-style:normal;'
  + 'border-radius:3px;'
  + 'padding-left:3px;'
  + 'padding-right:3px;'
  + 'box-shadow:1px 1px 3px rgba(0,0,0,0.3);'
  + 'text-decoration:none;'
  + '}';
HL_LIST.forEach(({ fg, bg }, idx) => {
  cssText += ` .${HL_CLASS}_${idx} {color:${fg};background:${bg};}`;
});
css.innerHTML = cssText;
document.body.appendChild(css);

const keyword2Handler = new Map();

document.body.addEventListener('dblclick', () => {
  let selection = window.getSelection();
  let rangeCount = selection.rangeCount;
  if (rangeCount > 1) {
    console.log('highlight selection with ranges is not support now..');
    return;
  }

  let range = selection.getRangeAt(0);
  let { startContainer, endContainer } = range;
  if (startContainer !== endContainer) {
    console.log('highlight selection over nodes is not support now..');
    return;
  }

  let selectedText = selection.toString().trim();
  if (!selectedText) {
    return;
  }

  let anchorNode = selection.anchorNode;
  let handler = keyword2Handler.get(selectedText);
  if (handler) {
    keyword2Handler.delete(selectedText);
    let hlNode = anchorNode.parentNode;
    handler.highlightedNodes.forEach((n) => {
      if (hlNode !== n && n) {
        HighlightHandler.resetNode(n);
      }
    });
    HighlightHandler.resetSelection(selectedText.length, hlNode);
  } else {
    let hh = new HighlightHandler(selectedText, anchorNode, range.startOffset, (color++) % HL_LIST.length);
    hh.highlight(document.body);
    keyword2Handler.set(selectedText, hh);
  }

  requestUpdateStripe();
});

let updateStripeRequested = false;
const doUpdateStripe = () => {
  updateStripeRequested = false;
  updateStripe(keyword2Handler.values());
};

const requestUpdateStripe = () => {
  if (!updateStripeRequested) {
    updateStripeRequested = true;
    requestAnimationFrame(doUpdateStripe);
  }
};

window.addEventListener('resize', requestUpdateStripe);

class HighlightHandler {
  constructor(keyword, anchorNode, anchorOffset, colorIndex) {
    this.keyword = keyword;
    this.anchorNode = anchorNode;
    this.anchorOffset = anchorOffset;
    this.color = HL_LIST[colorIndex].bg;
    this.className = `${HL_STYLE}${colorIndex}`;
    this.highlightedNodes = [];
  }

  static nodeFilter(node) {
    let pNode = node.parentNode;
    let pTag = pNode.tagName;
    return (pNode && !pNode.classList.contains(HL_CLASS) && !(pTag === 'SCRIPT' || pTag === 'STYLE'))
      ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
  }

  static resetNode(hlNode) {
    let prevNode = hlNode.previousSibling;
    let nextNode = hlNode.nextSibling;

    if (prevNode && nextNode) {
      if (prevNode.nodeType === Node.TEXT_NODE && nextNode.nodeType === Node.TEXT_NODE) {
        HighlightHandler.mergePrevNextText(hlNode, prevNode, nextNode);
      } else if (prevNode.nodeType === Node.TEXT_NODE) {
        HighlightHandler.mergePrevText(hlNode, prevNode);
      } else if (nextNode.nodeType === Node.TEXT_NODE) {
        HighlightHandler.mergeNextText(hlNode, nextNode);
      } else {
        // console.log('resetNode: prevNode && nextNode but neither == t3');
        HighlightHandler.replaceHighlight(hlNode);
      }
    } else if (prevNode) {
      if (prevNode.nodeType === Node.TEXT_NODE) {
        HighlightHandler.mergePrevText(hlNode, prevNode);
      } else {
        // console.log('resetNode: prevNode && !nextNode but prevNode != t3');
        HighlightHandler.replaceHighlight(hlNode);
      }
    } else if (nextNode) {
      if (nextNode.nodeType === Node.TEXT_NODE) {
        HighlightHandler.mergeNextText(hlNode, nextNode);
      } else {
        // console.log('resetNode: !prevNode && nextNode but nextNode != t3');
        HighlightHandler.replaceHighlight(hlNode);
      }
    } else {
      // console.log('resetNode: !prevNode && !nextNode');
      HighlightHandler.replaceHighlight(hlNode);
    }
  }

  static mergePrevNextText(hlNode, prevNode, nextNode) {
    // console.log('mergePrevNextText', hlNode, prevNode, nextNode);
    prevNode.nodeValue = prevNode.nodeValue + hlNode.innerText + nextNode.nodeValue;
    nextNode.remove();
    hlNode.remove();
  }

  static mergePrevText(hlNode, prevNode) {
    // console.log('mergePrevText', hlNode, prevNode);
    prevNode.nodeValue = prevNode.nodeValue + hlNode.innerText;
    hlNode.remove();
  }

  static mergeNextText(hlNode, nextNode) {
    // console.log('mergeNextText', hlNode, nextNode);
    nextNode.nodeValue = hlNode.innerText + nextNode.nodeValue;
    hlNode.remove();
  }

  static replaceHighlight(hlNode) {
    let original = document.createTextNode(hlNode.innerText);
    hlNode.parentNode.replaceChild(original, hlNode);
    return original;
  }

  static resetSelection(len, hlNode) {
    let prevNode = hlNode.previousSibling;
    let nextNode = hlNode.nextSibling;

    if (prevNode && nextNode) {
      if (prevNode.nodeType === Node.TEXT_NODE && nextNode.nodeType === Node.TEXT_NODE) {
        let start = prevNode.length;
        HighlightHandler.mergePrevNextText(hlNode, prevNode, nextNode);
        HighlightHandler.selectRange(prevNode, start, start + len);
      } else if (prevNode.nodeType === Node.TEXT_NODE) {
        let start = prevNode.length;
        HighlightHandler.mergePrevText(hlNode, prevNode);
        HighlightHandler.selectRange(prevNode, start, start + len);
      } else if (nextNode.nodeType === Node.TEXT_NODE) {
        HighlightHandler.mergeNextText(hlNode, nextNode);
        HighlightHandler.selectRange(nextNode, 0, len);
      } else {
        let original = HighlightHandler.replaceHighlight(hlNode);
        HighlightHandler.selectRange(original, 0, original.length);
      }
    } else if (prevNode) {
      if (prevNode.nodeType === Node.TEXT_NODE) {
        let start = prevNode.length;
        HighlightHandler.mergePrevText(hlNode, prevNode);
        HighlightHandler.selectRange(prevNode, start, start + len);
      } else {
        // console.log('resetSelection: prevNode && !nextNode but prevNode != t3');
        let original = HighlightHandler.replaceHighlight(hlNode);
        HighlightHandler.selectRange(original, 0, original.length);
      }
    } else if (nextNode) {
      if (nextNode.nodeType === Node.TEXT_NODE) {
        HighlightHandler.mergeNextText(hlNode, nextNode);
        HighlightHandler.selectRange(nextNode, 0, len);
      } else {
        // console.log('resetSelection: !prevNode && nextNode but nextNode != t3');
        let original = HighlightHandler.replaceHighlight(hlNode);
        HighlightHandler.selectRange(original, 0, original.length);
      }
    } else {
      // console.log('resetSelection: !prevNode && !nextNode');
      let original = HighlightHandler.replaceHighlight(hlNode);
      HighlightHandler.selectRange(original, 0, original.length);
    }
  }

  static selectRange(textNode, start, end) {
    let range = document.createRange();
    range.setStart(textNode, start);
    range.setEnd(textNode, end);
    let selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  highlight(container) {
    for (let node, it = document.createNodeIterator(container, NodeFilter.SHOW_TEXT, HighlightHandler.nodeFilter, false);
         node = it.nextNode();) {
      if (node !== this.anchorNode) {
        this.highlightNode(node);
      }
    }

    this.highlightSelection();
  }

  highlightNode(node) {
    const len = this.keyword.length;
    const content = node.nodeValue;

    const fragment = document.createDocumentFragment();

    let curr = 0;
    let last = 0;
    while (curr + len <= content.length) {
      curr = content.indexOf(this.keyword, curr);
      if (curr === -1) {
        break; // no more match..
      }

      if (curr !== 0) {
        const prevNode = document.createTextNode(content.slice(last, curr));
        fragment.appendChild(prevNode);
      }

      last = curr + len;
      const hlNode = document.createElement('span');
      hlNode.className = this.className;
      hlNode.innerText = content.slice(curr, last);
      fragment.appendChild(hlNode);
      this.highlightedNodes.push(hlNode);

      curr = last;
    }

    if (last !== 0) {
      fragment.appendChild(document.createTextNode(content.slice(last)));
      node.parentNode.replaceChild(fragment, node);
    }
  }

  highlightSelection() {
    let len = this.keyword.length;
    let content = this.anchorNode.nodeValue;
    let fragment = document.createDocumentFragment();

    let selectedNode; // the node with selected text
    let curr = 0;
    let last = 0;
    if (this.anchorOffset) {
      while (curr + len <= this.anchorOffset) {
        curr = content.indexOf(this.keyword, curr);
        if (curr === this.anchorOffset) {
          curr = last;
          break; // reach selection
        }

        if (curr !== 0) {
          let prevNode = document.createTextNode(content.slice(last, curr));
          fragment.appendChild(prevNode);
        }

        last = curr + len;
        let hlNode = document.createElement('span');
        hlNode.className = this.className;
        hlNode.innerText = content.slice(curr, last);
        fragment.appendChild(hlNode);
        this.highlightedNodes.push(hlNode);

        curr = last;
      }

      if (curr < this.anchorOffset) {
        let prevNode = document.createTextNode(content.slice(curr, this.anchorOffset));
        fragment.appendChild(prevNode);
      }

      selectedNode = document.createElement('span');
      selectedNode.className = this.className;
      selectedNode.innerText = content.slice(this.anchorOffset, this.anchorOffset + len);
      fragment.appendChild(selectedNode);
      this.highlightedNodes.push(selectedNode);

      curr = last = this.anchorOffset + len;
    } else {
      selectedNode = document.createElement('span');
      selectedNode.className = this.className;
      selectedNode.innerText = content.slice(0, len);
      fragment.appendChild(selectedNode);
      this.highlightedNodes.push(selectedNode);

      curr = last = len;
    }

    while (curr + len <= content.length) {
      curr = content.indexOf(this.keyword, curr);
      if (curr === -1) {
        break; // no more match..
      }

      if (curr !== this.anchorOffset + len) {
        let prevNode = document.createTextNode(content.slice(last, curr));
        fragment.appendChild(prevNode);
      }

      last = curr + len;
      let hlNode = document.createElement('span');
      hlNode.className = this.className;
      hlNode.innerText = content.slice(curr, last);
      fragment.appendChild(hlNode);
      this.highlightedNodes.push(hlNode);

      curr = last;
    }

    fragment.appendChild(document.createTextNode(content.slice(last)));
    this.anchorNode.parentNode.replaceChild(fragment, this.anchorNode);

    if (selectedNode) {
      let range = document.createRange();
      range.selectNodeContents(selectedNode);
      let selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      console.log('highlightSelection: without selectedNode');
    }
  }
}

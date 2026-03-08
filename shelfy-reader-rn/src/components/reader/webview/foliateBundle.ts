/**
 * Auto-generated from shelfy-reader (foliate-js fork) bundle.
 * Do not edit manually — rebuild from the shelfy-reader source.
 */
// eslint-disable-next-line
export const FOLIATE_JS = `"use strict";
var SelfyReader = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
  var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
  var __privateWrapper = (obj, member, setter, getter) => ({
    set _(value) {
      __privateSet(obj, member, value, setter);
    },
    get _() {
      return __privateGet(obj, member, getter);
    }
  });

  // src/libs/foliate-js/epubcfi.ts
  var findIndices, splitAt, concatArrays, isNumber, isCFI, escapeCFI, wrap, unwrap, lift, joinIndir, tokenizer, findTokens, parser, parserIndir, parse, partToString, toInnerString, toString, collapse, buildRange, isTextNode, isElementNode, getChildNodes, indexChildNodes, partsToNode, nodeToParts, fromRange, toRange, fromElements, toElement, fake;
  var init_epubcfi = __esm({
    "src/libs/foliate-js/epubcfi.ts"() {
      "use strict";
      findIndices = (arr, f3) => arr.map((x3, i3, a3) => f3(x3, i3, a3) ? i3 : null).filter((x3) => x3 != null);
      splitAt = (arr, is) => [-1, ...is, arr.length].reduce(({ xs, a: a3 }, b3) => ({ xs: xs?.concat([arr.slice(a3 + 1, b3)]) ?? [], a: b3 }), {}).xs;
      concatArrays = (a3, b3) => a3.slice(0, -1).concat([a3[a3.length - 1].concat(b3[0])]).concat(b3.slice(1));
      isNumber = /\\d/;
      isCFI = /^epubcfi\\((.*)\\)$/;
      escapeCFI = (str) => str.replace(/[\\^[\\](),;=]/g, "^$&");
      wrap = (x3) => isCFI.test(x3) ? x3 : \`epubcfi(\${x3})\`;
      unwrap = (x3) => x3.match(isCFI)?.[1] ?? x3;
      lift = (f3) => (...xs) => \`epubcfi(\${f3(...xs.map((x3) => x3.match(isCFI)?.[1] ?? x3))})\`;
      joinIndir = lift((...xs) => xs.join("!"));
      tokenizer = (str) => {
        const tokens = [];
        let state, escape, value = "";
        const push = (x3) => {
          tokens.push(x3);
          state = null;
          value = "";
        };
        const cat = (x3) => {
          value += x3;
          escape = false;
        };
        for (const char of Array.from(str.trim()).concat("")) {
          if (char === "^" && !escape) {
            escape = true;
            continue;
          }
          if (state === "!") push(["!"]);
          else if (state === ",") push([","]);
          else if (state === "/" || state === ":") {
            if (isNumber.test(char)) {
              cat(char);
              continue;
            } else push([state, parseInt(value)]);
          } else if (state === "~") {
            if (isNumber.test(char) || char === ".") {
              cat(char);
              continue;
            } else push(["~", parseFloat(value)]);
          } else if (state === "@") {
            if (char === ":") {
              push(["@", parseFloat(value)]);
              state = "@";
              continue;
            }
            if (isNumber.test(char) || char === ".") {
              cat(char);
              continue;
            } else push(["@", parseFloat(value)]);
          } else if (state === "[") {
            if (char === ";" && !escape) {
              push(["[", value]);
              state = ";";
            } else if (char === "," && !escape) {
              push(["[", value]);
              state = "[";
            } else if (char === "]" && !escape) push(["[", value]);
            else cat(char);
            continue;
          } else if (state?.startsWith(";")) {
            if (char === "=" && !escape) {
              state = \`;\${value}\`;
              value = "";
            } else if (char === ";" && !escape) {
              push([state, value]);
              state = ";";
            } else if (char === "]" && !escape) push([state, value]);
            else cat(char);
            continue;
          }
          if (char === "/" || char === ":" || char === "~" || char === "@" || char === "[" || char === "!" || char === ",") state = char;
        }
        return tokens;
      };
      findTokens = (tokens, x3) => findIndices(tokens, ([t3]) => t3 === x3);
      parser = (tokens) => {
        const parts = [];
        let state;
        for (const [type, val] of tokens) {
          if (type === "/") parts.push({ index: val });
          else {
            const last = parts[parts.length - 1];
            if (type === ":") last.offset = val;
            else if (type === "~") last.temporal = val;
            else if (type === "@") last.spatial = (last.spatial ?? []).concat(val);
            else if (type === ";s") last.side = val;
            else if (type === "[") {
              if (state === "/" && val) last.id = val;
              else {
                last.text = (last.text ?? []).concat(val);
                continue;
              }
            }
          }
          state = type;
        }
        return parts;
      };
      parserIndir = (tokens) => splitAt(tokens, findTokens(tokens, "!")).map(parser);
      parse = (cfi) => {
        const tokens = tokenizer(unwrap(cfi));
        const commas = findTokens(tokens, ",");
        if (!commas.length) return parserIndir(tokens);
        const [parent, start, end] = splitAt(tokens, commas).map(parserIndir);
        return { parent, start, end };
      };
      partToString = ({ index, id, offset, temporal, spatial, text, side }) => {
        const param = side ? \`;s=\${side}\` : "";
        return \`/\${index}\` + (id ? \`[\${escapeCFI(id)}\${param}]\` : "") + (offset != null && index % 2 ? \`:\${offset}\` : "") + (temporal ? \`~\${temporal}\` : "") + (spatial ? \`@\${spatial.join(":")}\` : "") + (text || !id && side ? "[" + (text?.map(escapeCFI)?.join(",") ?? "") + param + "]" : "");
      };
      toInnerString = (parsed) => parsed.parent ? [parsed.parent, parsed.start, parsed.end].map(toInnerString).join(",") : parsed.map((parts) => parts.map(partToString).join("")).join("!");
      toString = (parsed) => wrap(toInnerString(parsed));
      collapse = (x3, toEnd) => {
        if (typeof x3 === "string") return toString(collapse(parse(x3), toEnd));
        return x3.parent ? concatArrays(x3.parent, x3[toEnd ? "end" : "start"]) : x3;
      };
      buildRange = (from, to) => {
        let fromParts = typeof from === "string" ? collapse(parse(from)) : from;
        let toParts = typeof to === "string" ? collapse(parse(to), true) : to;
        fromParts = collapse(fromParts);
        toParts = collapse(toParts, true);
        const localFrom = fromParts[fromParts.length - 1], localTo = toParts[toParts.length - 1];
        const localParent = [], localStart = [], localEnd = [];
        let pushToParent = true;
        const len = Math.max(localFrom.length, localTo.length);
        for (let i3 = 0; i3 < len; i3++) {
          const a3 = localFrom[i3], b3 = localTo[i3];
          pushToParent && (pushToParent = a3?.index === b3?.index && !a3?.offset && !b3?.offset);
          if (pushToParent) localParent.push(a3);
          else {
            if (a3) localStart.push(a3);
            if (b3) localEnd.push(b3);
          }
        }
        const parent = fromParts.slice(0, -1).concat([localParent]);
        return toString({ parent, start: [localStart], end: [localEnd] });
      };
      isTextNode = ({ nodeType }) => nodeType === 3 || nodeType === 4;
      isElementNode = ({ nodeType }) => nodeType === 1;
      getChildNodes = (node, filter3) => {
        const nodes = Array.from(node.childNodes).filter((node2) => isTextNode(node2) || isElementNode(node2));
        return filter3 ? nodes.map((node2) => {
          const accept = filter3(node2);
          if (accept === NodeFilter.FILTER_REJECT) return null;
          else if (accept === NodeFilter.FILTER_SKIP) return getChildNodes(node2, filter3);
          else return node2;
        }).flat().filter((x3) => x3 != null) : nodes;
      };
      indexChildNodes = (node, filter3) => {
        const nodes = getChildNodes(node, filter3).reduce((arr, node2) => {
          let last = arr[arr.length - 1];
          if (!last) arr.push(node2);
          else if (isTextNode(node2)) {
            if (Array.isArray(last)) last.push(node2);
            else if (isTextNode(last)) arr[arr.length - 1] = [last, node2];
            else arr.push(node2);
          } else {
            if (isElementNode(last)) arr.push(null, node2);
            else arr.push(node2);
          }
          return arr;
        }, []);
        if (isElementNode(nodes[0])) nodes.unshift("first");
        if (isElementNode(nodes[nodes.length - 1])) nodes.push("last");
        nodes.unshift("before");
        nodes.push("after");
        return nodes;
      };
      partsToNode = (node, parts, filter3) => {
        const { id } = parts[parts.length - 1];
        if (id) {
          const el = node.ownerDocument.getElementById(id);
          if (el) return { node: el, offset: 0 };
        }
        let current = node;
        for (const { index } of parts) {
          const newNode = current ? indexChildNodes(current, filter3)[index] : null;
          if (newNode === "first") return { node: current.firstChild ?? current };
          if (newNode === "last") return { node: current.lastChild ?? current };
          if (newNode === "before") return { node: current, before: true };
          if (newNode === "after") return { node: current, after: true };
          current = newNode;
        }
        const { offset } = parts[parts.length - 1];
        if (!Array.isArray(current)) return { node: current, offset };
        let sum = 0;
        for (const n3 of current) {
          const { length } = n3.nodeValue;
          if (sum + length >= (offset ?? 0)) return { node: n3, offset: (offset ?? 0) - sum };
          sum += length;
        }
        return { node: current[0], offset: 0 };
      };
      nodeToParts = (node, offset, filter3) => {
        const { parentNode } = node;
        const id = node.id;
        const indexed = indexChildNodes(parentNode, filter3);
        const index = indexed.findIndex((x3) => Array.isArray(x3) ? x3.some((x4) => x4 === node) : x3 === node);
        const chunk = indexed[index];
        let adjustedOffset = offset;
        if (Array.isArray(chunk)) {
          let sum = 0;
          for (const x3 of chunk) {
            if (x3 === node) {
              sum += offset ?? 0;
              break;
            } else sum += x3.nodeValue.length;
          }
          adjustedOffset = sum;
        }
        const part = { id, index, offset: adjustedOffset ?? void 0 };
        return (parentNode !== node.ownerDocument.documentElement ? nodeToParts(parentNode, null, filter3).concat(part) : [part]).filter((x3) => x3.index !== -1);
      };
      fromRange = (range, filter3) => {
        const { startContainer, startOffset, endContainer, endOffset } = range;
        const start = nodeToParts(startContainer, startOffset, filter3);
        if (range.collapsed) return toString([start]);
        const end = nodeToParts(endContainer, endOffset, filter3);
        return buildRange([start], [end]);
      };
      toRange = (doc, parts, filter3) => {
        const startParts = collapse(parts);
        const endParts = collapse(parts, true);
        const root = doc.documentElement;
        const start = partsToNode(root, startParts[0], filter3);
        const end = partsToNode(root, endParts[0], filter3);
        const range = doc.createRange();
        if (start.before) range.setStartBefore(start.node);
        else if (start.after) range.setStartAfter(start.node);
        else range.setStart(start.node, start.offset ?? 0);
        if (end.before) range.setEndBefore(end.node);
        else if (end.after) range.setEndAfter(end.node);
        else range.setEnd(end.node, end.offset ?? 0);
        return range;
      };
      fromElements = (elements) => {
        const results = [];
        const { parentNode } = elements[0];
        const parts = nodeToParts(parentNode);
        for (const [index, node] of indexChildNodes(parentNode).entries()) {
          const el = elements[results.length];
          if (node === el)
            results.push(toString([parts.concat({ id: el.id, index })]));
        }
        return results;
      };
      toElement = (doc, parts) => partsToNode(doc.documentElement, collapse(parts)).node;
      fake = {
        fromIndex: (index) => wrap(\`/6/\${(index + 1) * 2}\`),
        toIndex: (parts) => parts.at(-1).index / 2 - 1
      };
    }
  });

  // src/libs/foliate-js/vendor/zip.js
  var zip_exports = {};
  __export(zip_exports, {
    BlobReader: () => ut,
    BlobWriter: () => dt,
    TextWriter: () => ft,
    ZipReader: () => Ht,
    configure: () => T
  });
  function d() {
    let e3, i3, r3, a3, d2, f3;
    function h3(e4, i4, s3, o3, l3, c2, h4, _3, w2, b3, p3) {
      let m3, g3, y3, x3, k3, v3, S2, z3, A3, U3, D2, E3, F2, T3, O2;
      U3 = 0, k3 = s3;
      do {
        r3[e4[i4 + U3]]++, U3++, k3--;
      } while (0 !== k3);
      if (r3[0] == s3) return h4[0] = -1, _3[0] = 0, 0;
      for (z3 = _3[0], v3 = 1; v3 <= u && 0 === r3[v3]; v3++) ;
      for (S2 = v3, z3 < v3 && (z3 = v3), k3 = u; 0 !== k3 && 0 === r3[k3]; k3--) ;
      for (y3 = k3, z3 > k3 && (z3 = k3), _3[0] = z3, T3 = 1 << v3; v3 < k3; v3++, T3 <<= 1) if ((T3 -= r3[v3]) < 0) return t;
      if ((T3 -= r3[k3]) < 0) return t;
      for (r3[k3] += T3, f3[1] = v3 = 0, U3 = 1, F2 = 2; 0 != --k3; ) f3[F2] = v3 += r3[U3], F2++, U3++;
      k3 = 0, U3 = 0;
      do {
        0 !== (v3 = e4[i4 + U3]) && (p3[f3[v3]++] = k3), U3++;
      } while (++k3 < s3);
      for (s3 = f3[y3], f3[0] = k3 = 0, U3 = 0, x3 = -1, E3 = -z3, d2[0] = 0, D2 = 0, O2 = 0; S2 <= y3; S2++) for (m3 = r3[S2]; 0 != m3--; ) {
        for (; S2 > E3 + z3; ) {
          if (x3++, E3 += z3, O2 = y3 - E3, O2 = O2 > z3 ? z3 : O2, (g3 = 1 << (v3 = S2 - E3)) > m3 + 1 && (g3 -= m3 + 1, F2 = S2, v3 < O2)) for (; ++v3 < O2 && !((g3 <<= 1) <= r3[++F2]); ) g3 -= r3[F2];
          if (O2 = 1 << v3, b3[0] + O2 > 1440) return t;
          d2[x3] = D2 = b3[0], b3[0] += O2, 0 !== x3 ? (f3[x3] = k3, a3[0] = v3, a3[1] = z3, v3 = k3 >>> E3 - z3, a3[2] = D2 - d2[x3 - 1] - v3, w2.set(a3, 3 * (d2[x3 - 1] + v3))) : h4[0] = D2;
        }
        for (a3[1] = S2 - E3, U3 >= s3 ? a3[0] = 192 : p3[U3] < o3 ? (a3[0] = p3[U3] < 256 ? 0 : 96, a3[2] = p3[U3++]) : (a3[0] = c2[p3[U3] - o3] + 16 + 64, a3[2] = l3[p3[U3++] - o3]), g3 = 1 << S2 - E3, v3 = k3 >>> E3; v3 < O2; v3 += g3) w2.set(a3, 3 * (D2 + v3));
        for (v3 = 1 << S2 - 1; k3 & v3; v3 >>>= 1) k3 ^= v3;
        for (k3 ^= v3, A3 = (1 << E3) - 1; (k3 & A3) != f3[x3]; ) x3--, E3 -= z3, A3 = (1 << E3) - 1;
      }
      return 0 !== T3 && 1 != y3 ? n : 0;
    }
    function _2(t3) {
      let n3;
      for (e3 || (e3 = [], i3 = [], r3 = new Int32Array(16), a3 = [], d2 = new Int32Array(u), f3 = new Int32Array(16)), i3.length < t3 && (i3 = []), n3 = 0; n3 < t3; n3++) i3[n3] = 0;
      for (n3 = 0; n3 < 16; n3++) r3[n3] = 0;
      for (n3 = 0; n3 < 3; n3++) a3[n3] = 0;
      d2.set(r3.subarray(0, u), 0), f3.set(r3.subarray(0, 16), 0);
    }
    this.inflate_trees_bits = function(r4, a4, s3, o3, l3) {
      let c2;
      return _2(19), e3[0] = 0, c2 = h3(r4, 0, 19, 19, null, null, s3, a4, o3, e3, i3), c2 == t ? l3.msg = "oversubscribed dynamic bit lengths tree" : c2 != n && 0 !== a4[0] || (l3.msg = "incomplete dynamic bit lengths tree", c2 = t), c2;
    }, this.inflate_trees_dynamic = function(r4, a4, u2, d3, f4, w2, b3, p3, m3) {
      let g3;
      return _2(288), e3[0] = 0, g3 = h3(u2, 0, r4, 257, s, o, w2, d3, p3, e3, i3), 0 != g3 || 0 === d3[0] ? (g3 == t ? m3.msg = "oversubscribed literal/length tree" : -4 != g3 && (m3.msg = "incomplete literal/length tree", g3 = t), g3) : (_2(288), g3 = h3(u2, r4, a4, 0, l, c, b3, f4, p3, e3, i3), 0 != g3 || 0 === f4[0] && r4 > 257 ? (g3 == t ? m3.msg = "oversubscribed distance tree" : g3 == n ? (m3.msg = "incomplete distance tree", g3 = t) : -4 != g3 && (m3.msg = "empty distance tree with lengths", g3 = t), g3) : 0);
    };
  }
  function f() {
    const n3 = this;
    let r3, a3, s3, o3, l3 = 0, c2 = 0, u2 = 0, d2 = 0, f3 = 0, h3 = 0, _2 = 0, w2 = 0, b3 = 0, p3 = 0;
    function m3(e3, n4, r4, a4, s4, o4, l4, c3) {
      let u3, d3, f4, h4, _3, w3, b4, p4, m4, g3, y3, x3, k3, v3, S2, z3;
      b4 = c3.next_in_index, p4 = c3.avail_in, _3 = l4.bitb, w3 = l4.bitk, m4 = l4.write, g3 = m4 < l4.read ? l4.read - m4 - 1 : l4.end - m4, y3 = i[e3], x3 = i[n4];
      do {
        for (; w3 < 20; ) p4--, _3 |= (255 & c3.read_byte(b4++)) << w3, w3 += 8;
        if (u3 = _3 & y3, d3 = r4, f4 = a4, z3 = 3 * (f4 + u3), 0 !== (h4 = d3[z3])) for (; ; ) {
          if (_3 >>= d3[z3 + 1], w3 -= d3[z3 + 1], 16 & h4) {
            for (h4 &= 15, k3 = d3[z3 + 2] + (_3 & i[h4]), _3 >>= h4, w3 -= h4; w3 < 15; ) p4--, _3 |= (255 & c3.read_byte(b4++)) << w3, w3 += 8;
            for (u3 = _3 & x3, d3 = s4, f4 = o4, z3 = 3 * (f4 + u3), h4 = d3[z3]; ; ) {
              if (_3 >>= d3[z3 + 1], w3 -= d3[z3 + 1], 16 & h4) {
                for (h4 &= 15; w3 < h4; ) p4--, _3 |= (255 & c3.read_byte(b4++)) << w3, w3 += 8;
                if (v3 = d3[z3 + 2] + (_3 & i[h4]), _3 >>= h4, w3 -= h4, g3 -= k3, m4 >= v3) S2 = m4 - v3, m4 - S2 > 0 && 2 > m4 - S2 ? (l4.win[m4++] = l4.win[S2++], l4.win[m4++] = l4.win[S2++], k3 -= 2) : (l4.win.set(l4.win.subarray(S2, S2 + 2), m4), m4 += 2, S2 += 2, k3 -= 2);
                else {
                  S2 = m4 - v3;
                  do {
                    S2 += l4.end;
                  } while (S2 < 0);
                  if (h4 = l4.end - S2, k3 > h4) {
                    if (k3 -= h4, m4 - S2 > 0 && h4 > m4 - S2) do {
                      l4.win[m4++] = l4.win[S2++];
                    } while (0 != --h4);
                    else l4.win.set(l4.win.subarray(S2, S2 + h4), m4), m4 += h4, S2 += h4, h4 = 0;
                    S2 = 0;
                  }
                }
                if (m4 - S2 > 0 && k3 > m4 - S2) do {
                  l4.win[m4++] = l4.win[S2++];
                } while (0 != --k3);
                else l4.win.set(l4.win.subarray(S2, S2 + k3), m4), m4 += k3, S2 += k3, k3 = 0;
                break;
              }
              if (64 & h4) return c3.msg = "invalid distance code", k3 = c3.avail_in - p4, k3 = w3 >> 3 < k3 ? w3 >> 3 : k3, p4 += k3, b4 -= k3, w3 -= k3 << 3, l4.bitb = _3, l4.bitk = w3, c3.avail_in = p4, c3.total_in += b4 - c3.next_in_index, c3.next_in_index = b4, l4.write = m4, t;
              u3 += d3[z3 + 2], u3 += _3 & i[h4], z3 = 3 * (f4 + u3), h4 = d3[z3];
            }
            break;
          }
          if (64 & h4) return 32 & h4 ? (k3 = c3.avail_in - p4, k3 = w3 >> 3 < k3 ? w3 >> 3 : k3, p4 += k3, b4 -= k3, w3 -= k3 << 3, l4.bitb = _3, l4.bitk = w3, c3.avail_in = p4, c3.total_in += b4 - c3.next_in_index, c3.next_in_index = b4, l4.write = m4, 1) : (c3.msg = "invalid literal/length code", k3 = c3.avail_in - p4, k3 = w3 >> 3 < k3 ? w3 >> 3 : k3, p4 += k3, b4 -= k3, w3 -= k3 << 3, l4.bitb = _3, l4.bitk = w3, c3.avail_in = p4, c3.total_in += b4 - c3.next_in_index, c3.next_in_index = b4, l4.write = m4, t);
          if (u3 += d3[z3 + 2], u3 += _3 & i[h4], z3 = 3 * (f4 + u3), 0 === (h4 = d3[z3])) {
            _3 >>= d3[z3 + 1], w3 -= d3[z3 + 1], l4.win[m4++] = d3[z3 + 2], g3--;
            break;
          }
        }
        else _3 >>= d3[z3 + 1], w3 -= d3[z3 + 1], l4.win[m4++] = d3[z3 + 2], g3--;
      } while (g3 >= 258 && p4 >= 10);
      return k3 = c3.avail_in - p4, k3 = w3 >> 3 < k3 ? w3 >> 3 : k3, p4 += k3, b4 -= k3, w3 -= k3 << 3, l4.bitb = _3, l4.bitk = w3, c3.avail_in = p4, c3.total_in += b4 - c3.next_in_index, c3.next_in_index = b4, l4.write = m4, 0;
    }
    n3.init = function(e3, t3, n4, i3, l4, c3) {
      r3 = 0, _2 = e3, w2 = t3, s3 = n4, b3 = i3, o3 = l4, p3 = c3, a3 = null;
    }, n3.proc = function(n4, g3, y3) {
      let x3, k3, v3, S2, z3, A3, U3, D2 = 0, E3 = 0, F2 = 0;
      for (F2 = g3.next_in_index, S2 = g3.avail_in, D2 = n4.bitb, E3 = n4.bitk, z3 = n4.write, A3 = z3 < n4.read ? n4.read - z3 - 1 : n4.end - z3; ; ) switch (r3) {
        case 0:
          if (A3 >= 258 && S2 >= 10 && (n4.bitb = D2, n4.bitk = E3, g3.avail_in = S2, g3.total_in += F2 - g3.next_in_index, g3.next_in_index = F2, n4.write = z3, y3 = m3(_2, w2, s3, b3, o3, p3, n4, g3), F2 = g3.next_in_index, S2 = g3.avail_in, D2 = n4.bitb, E3 = n4.bitk, z3 = n4.write, A3 = z3 < n4.read ? n4.read - z3 - 1 : n4.end - z3, 0 != y3)) {
            r3 = 1 == y3 ? 7 : 9;
            break;
          }
          u2 = _2, a3 = s3, c2 = b3, r3 = 1;
        case 1:
          for (x3 = u2; E3 < x3; ) {
            if (0 === S2) return n4.bitb = D2, n4.bitk = E3, g3.avail_in = S2, g3.total_in += F2 - g3.next_in_index, g3.next_in_index = F2, n4.write = z3, n4.inflate_flush(g3, y3);
            y3 = 0, S2--, D2 |= (255 & g3.read_byte(F2++)) << E3, E3 += 8;
          }
          if (k3 = 3 * (c2 + (D2 & i[x3])), D2 >>>= a3[k3 + 1], E3 -= a3[k3 + 1], v3 = a3[k3], 0 === v3) {
            d2 = a3[k3 + 2], r3 = 6;
            break;
          }
          if (16 & v3) {
            f3 = 15 & v3, l3 = a3[k3 + 2], r3 = 2;
            break;
          }
          if (!(64 & v3)) {
            u2 = v3, c2 = k3 / 3 + a3[k3 + 2];
            break;
          }
          if (32 & v3) {
            r3 = 7;
            break;
          }
          return r3 = 9, g3.msg = "invalid literal/length code", y3 = t, n4.bitb = D2, n4.bitk = E3, g3.avail_in = S2, g3.total_in += F2 - g3.next_in_index, g3.next_in_index = F2, n4.write = z3, n4.inflate_flush(g3, y3);
        case 2:
          for (x3 = f3; E3 < x3; ) {
            if (0 === S2) return n4.bitb = D2, n4.bitk = E3, g3.avail_in = S2, g3.total_in += F2 - g3.next_in_index, g3.next_in_index = F2, n4.write = z3, n4.inflate_flush(g3, y3);
            y3 = 0, S2--, D2 |= (255 & g3.read_byte(F2++)) << E3, E3 += 8;
          }
          l3 += D2 & i[x3], D2 >>= x3, E3 -= x3, u2 = w2, a3 = o3, c2 = p3, r3 = 3;
        case 3:
          for (x3 = u2; E3 < x3; ) {
            if (0 === S2) return n4.bitb = D2, n4.bitk = E3, g3.avail_in = S2, g3.total_in += F2 - g3.next_in_index, g3.next_in_index = F2, n4.write = z3, n4.inflate_flush(g3, y3);
            y3 = 0, S2--, D2 |= (255 & g3.read_byte(F2++)) << E3, E3 += 8;
          }
          if (k3 = 3 * (c2 + (D2 & i[x3])), D2 >>= a3[k3 + 1], E3 -= a3[k3 + 1], v3 = a3[k3], 16 & v3) {
            f3 = 15 & v3, h3 = a3[k3 + 2], r3 = 4;
            break;
          }
          if (!(64 & v3)) {
            u2 = v3, c2 = k3 / 3 + a3[k3 + 2];
            break;
          }
          return r3 = 9, g3.msg = "invalid distance code", y3 = t, n4.bitb = D2, n4.bitk = E3, g3.avail_in = S2, g3.total_in += F2 - g3.next_in_index, g3.next_in_index = F2, n4.write = z3, n4.inflate_flush(g3, y3);
        case 4:
          for (x3 = f3; E3 < x3; ) {
            if (0 === S2) return n4.bitb = D2, n4.bitk = E3, g3.avail_in = S2, g3.total_in += F2 - g3.next_in_index, g3.next_in_index = F2, n4.write = z3, n4.inflate_flush(g3, y3);
            y3 = 0, S2--, D2 |= (255 & g3.read_byte(F2++)) << E3, E3 += 8;
          }
          h3 += D2 & i[x3], D2 >>= x3, E3 -= x3, r3 = 5;
        case 5:
          for (U3 = z3 - h3; U3 < 0; ) U3 += n4.end;
          for (; 0 !== l3; ) {
            if (0 === A3 && (z3 == n4.end && 0 !== n4.read && (z3 = 0, A3 = z3 < n4.read ? n4.read - z3 - 1 : n4.end - z3), 0 === A3 && (n4.write = z3, y3 = n4.inflate_flush(g3, y3), z3 = n4.write, A3 = z3 < n4.read ? n4.read - z3 - 1 : n4.end - z3, z3 == n4.end && 0 !== n4.read && (z3 = 0, A3 = z3 < n4.read ? n4.read - z3 - 1 : n4.end - z3), 0 === A3))) return n4.bitb = D2, n4.bitk = E3, g3.avail_in = S2, g3.total_in += F2 - g3.next_in_index, g3.next_in_index = F2, n4.write = z3, n4.inflate_flush(g3, y3);
            n4.win[z3++] = n4.win[U3++], A3--, U3 == n4.end && (U3 = 0), l3--;
          }
          r3 = 0;
          break;
        case 6:
          if (0 === A3 && (z3 == n4.end && 0 !== n4.read && (z3 = 0, A3 = z3 < n4.read ? n4.read - z3 - 1 : n4.end - z3), 0 === A3 && (n4.write = z3, y3 = n4.inflate_flush(g3, y3), z3 = n4.write, A3 = z3 < n4.read ? n4.read - z3 - 1 : n4.end - z3, z3 == n4.end && 0 !== n4.read && (z3 = 0, A3 = z3 < n4.read ? n4.read - z3 - 1 : n4.end - z3), 0 === A3))) return n4.bitb = D2, n4.bitk = E3, g3.avail_in = S2, g3.total_in += F2 - g3.next_in_index, g3.next_in_index = F2, n4.write = z3, n4.inflate_flush(g3, y3);
          y3 = 0, n4.win[z3++] = d2, A3--, r3 = 0;
          break;
        case 7:
          if (E3 > 7 && (E3 -= 8, S2++, F2--), n4.write = z3, y3 = n4.inflate_flush(g3, y3), z3 = n4.write, A3 = z3 < n4.read ? n4.read - z3 - 1 : n4.end - z3, n4.read != n4.write) return n4.bitb = D2, n4.bitk = E3, g3.avail_in = S2, g3.total_in += F2 - g3.next_in_index, g3.next_in_index = F2, n4.write = z3, n4.inflate_flush(g3, y3);
          r3 = 8;
        case 8:
          return y3 = 1, n4.bitb = D2, n4.bitk = E3, g3.avail_in = S2, g3.total_in += F2 - g3.next_in_index, g3.next_in_index = F2, n4.write = z3, n4.inflate_flush(g3, y3);
        case 9:
          return y3 = t, n4.bitb = D2, n4.bitk = E3, g3.avail_in = S2, g3.total_in += F2 - g3.next_in_index, g3.next_in_index = F2, n4.write = z3, n4.inflate_flush(g3, y3);
        default:
          return y3 = e, n4.bitb = D2, n4.bitk = E3, g3.avail_in = S2, g3.total_in += F2 - g3.next_in_index, g3.next_in_index = F2, n4.write = z3, n4.inflate_flush(g3, y3);
      }
    }, n3.free = function() {
    };
  }
  function _(r3, a3) {
    const s3 = this;
    let o3, l3 = 0, c2 = 0, u2 = 0, _2 = 0;
    const w2 = [0], b3 = [0], p3 = new f();
    let m3 = 0, g3 = new Int32Array(4320);
    const y3 = new d();
    s3.bitk = 0, s3.bitb = 0, s3.win = new Uint8Array(a3), s3.end = a3, s3.read = 0, s3.write = 0, s3.reset = function(e3, t3) {
      t3 && (t3[0] = 0), 6 == l3 && p3.free(e3), l3 = 0, s3.bitk = 0, s3.bitb = 0, s3.read = s3.write = 0;
    }, s3.reset(r3, null), s3.inflate_flush = function(e3, t3) {
      let i3, r4, a4;
      return r4 = e3.next_out_index, a4 = s3.read, i3 = (a4 <= s3.write ? s3.write : s3.end) - a4, i3 > e3.avail_out && (i3 = e3.avail_out), 0 !== i3 && t3 == n && (t3 = 0), e3.avail_out -= i3, e3.total_out += i3, e3.next_out.set(s3.win.subarray(a4, a4 + i3), r4), r4 += i3, a4 += i3, a4 == s3.end && (a4 = 0, s3.write == s3.end && (s3.write = 0), i3 = s3.write - a4, i3 > e3.avail_out && (i3 = e3.avail_out), 0 !== i3 && t3 == n && (t3 = 0), e3.avail_out -= i3, e3.total_out += i3, e3.next_out.set(s3.win.subarray(a4, a4 + i3), r4), r4 += i3, a4 += i3), e3.next_out_index = r4, s3.read = a4, t3;
    }, s3.proc = function(n3, r4) {
      let a4, f3, x3, k3, v3, S2, z3, A3;
      for (k3 = n3.next_in_index, v3 = n3.avail_in, f3 = s3.bitb, x3 = s3.bitk, S2 = s3.write, z3 = S2 < s3.read ? s3.read - S2 - 1 : s3.end - S2; ; ) {
        let U3, D2, E3, F2, T3, O2, C2, W2;
        switch (l3) {
          case 0:
            for (; x3 < 3; ) {
              if (0 === v3) return s3.bitb = f3, s3.bitk = x3, n3.avail_in = v3, n3.total_in += k3 - n3.next_in_index, n3.next_in_index = k3, s3.write = S2, s3.inflate_flush(n3, r4);
              r4 = 0, v3--, f3 |= (255 & n3.read_byte(k3++)) << x3, x3 += 8;
            }
            switch (a4 = 7 & f3, m3 = 1 & a4, a4 >>> 1) {
              case 0:
                f3 >>>= 3, x3 -= 3, a4 = 7 & x3, f3 >>>= a4, x3 -= a4, l3 = 1;
                break;
              case 1:
                U3 = [], D2 = [], E3 = [[]], F2 = [[]], d.inflate_trees_fixed(U3, D2, E3, F2), p3.init(U3[0], D2[0], E3[0], 0, F2[0], 0), f3 >>>= 3, x3 -= 3, l3 = 6;
                break;
              case 2:
                f3 >>>= 3, x3 -= 3, l3 = 3;
                break;
              case 3:
                return f3 >>>= 3, x3 -= 3, l3 = 9, n3.msg = "invalid block type", r4 = t, s3.bitb = f3, s3.bitk = x3, n3.avail_in = v3, n3.total_in += k3 - n3.next_in_index, n3.next_in_index = k3, s3.write = S2, s3.inflate_flush(n3, r4);
            }
            break;
          case 1:
            for (; x3 < 32; ) {
              if (0 === v3) return s3.bitb = f3, s3.bitk = x3, n3.avail_in = v3, n3.total_in += k3 - n3.next_in_index, n3.next_in_index = k3, s3.write = S2, s3.inflate_flush(n3, r4);
              r4 = 0, v3--, f3 |= (255 & n3.read_byte(k3++)) << x3, x3 += 8;
            }
            if ((~f3 >>> 16 & 65535) != (65535 & f3)) return l3 = 9, n3.msg = "invalid stored block lengths", r4 = t, s3.bitb = f3, s3.bitk = x3, n3.avail_in = v3, n3.total_in += k3 - n3.next_in_index, n3.next_in_index = k3, s3.write = S2, s3.inflate_flush(n3, r4);
            c2 = 65535 & f3, f3 = x3 = 0, l3 = 0 !== c2 ? 2 : 0 !== m3 ? 7 : 0;
            break;
          case 2:
            if (0 === v3) return s3.bitb = f3, s3.bitk = x3, n3.avail_in = v3, n3.total_in += k3 - n3.next_in_index, n3.next_in_index = k3, s3.write = S2, s3.inflate_flush(n3, r4);
            if (0 === z3 && (S2 == s3.end && 0 !== s3.read && (S2 = 0, z3 = S2 < s3.read ? s3.read - S2 - 1 : s3.end - S2), 0 === z3 && (s3.write = S2, r4 = s3.inflate_flush(n3, r4), S2 = s3.write, z3 = S2 < s3.read ? s3.read - S2 - 1 : s3.end - S2, S2 == s3.end && 0 !== s3.read && (S2 = 0, z3 = S2 < s3.read ? s3.read - S2 - 1 : s3.end - S2), 0 === z3))) return s3.bitb = f3, s3.bitk = x3, n3.avail_in = v3, n3.total_in += k3 - n3.next_in_index, n3.next_in_index = k3, s3.write = S2, s3.inflate_flush(n3, r4);
            if (r4 = 0, a4 = c2, a4 > v3 && (a4 = v3), a4 > z3 && (a4 = z3), s3.win.set(n3.read_buf(k3, a4), S2), k3 += a4, v3 -= a4, S2 += a4, z3 -= a4, 0 != (c2 -= a4)) break;
            l3 = 0 !== m3 ? 7 : 0;
            break;
          case 3:
            for (; x3 < 14; ) {
              if (0 === v3) return s3.bitb = f3, s3.bitk = x3, n3.avail_in = v3, n3.total_in += k3 - n3.next_in_index, n3.next_in_index = k3, s3.write = S2, s3.inflate_flush(n3, r4);
              r4 = 0, v3--, f3 |= (255 & n3.read_byte(k3++)) << x3, x3 += 8;
            }
            if (u2 = a4 = 16383 & f3, (31 & a4) > 29 || (a4 >> 5 & 31) > 29) return l3 = 9, n3.msg = "too many length or distance symbols", r4 = t, s3.bitb = f3, s3.bitk = x3, n3.avail_in = v3, n3.total_in += k3 - n3.next_in_index, n3.next_in_index = k3, s3.write = S2, s3.inflate_flush(n3, r4);
            if (a4 = 258 + (31 & a4) + (a4 >> 5 & 31), !o3 || o3.length < a4) o3 = [];
            else for (A3 = 0; A3 < a4; A3++) o3[A3] = 0;
            f3 >>>= 14, x3 -= 14, _2 = 0, l3 = 4;
          case 4:
            for (; _2 < 4 + (u2 >>> 10); ) {
              for (; x3 < 3; ) {
                if (0 === v3) return s3.bitb = f3, s3.bitk = x3, n3.avail_in = v3, n3.total_in += k3 - n3.next_in_index, n3.next_in_index = k3, s3.write = S2, s3.inflate_flush(n3, r4);
                r4 = 0, v3--, f3 |= (255 & n3.read_byte(k3++)) << x3, x3 += 8;
              }
              o3[h[_2++]] = 7 & f3, f3 >>>= 3, x3 -= 3;
            }
            for (; _2 < 19; ) o3[h[_2++]] = 0;
            if (w2[0] = 7, a4 = y3.inflate_trees_bits(o3, w2, b3, g3, n3), 0 != a4) return (r4 = a4) == t && (o3 = null, l3 = 9), s3.bitb = f3, s3.bitk = x3, n3.avail_in = v3, n3.total_in += k3 - n3.next_in_index, n3.next_in_index = k3, s3.write = S2, s3.inflate_flush(n3, r4);
            _2 = 0, l3 = 5;
          case 5:
            for (; a4 = u2, !(_2 >= 258 + (31 & a4) + (a4 >> 5 & 31)); ) {
              let e3, c3;
              for (a4 = w2[0]; x3 < a4; ) {
                if (0 === v3) return s3.bitb = f3, s3.bitk = x3, n3.avail_in = v3, n3.total_in += k3 - n3.next_in_index, n3.next_in_index = k3, s3.write = S2, s3.inflate_flush(n3, r4);
                r4 = 0, v3--, f3 |= (255 & n3.read_byte(k3++)) << x3, x3 += 8;
              }
              if (a4 = g3[3 * (b3[0] + (f3 & i[a4])) + 1], c3 = g3[3 * (b3[0] + (f3 & i[a4])) + 2], c3 < 16) f3 >>>= a4, x3 -= a4, o3[_2++] = c3;
              else {
                for (A3 = 18 == c3 ? 7 : c3 - 14, e3 = 18 == c3 ? 11 : 3; x3 < a4 + A3; ) {
                  if (0 === v3) return s3.bitb = f3, s3.bitk = x3, n3.avail_in = v3, n3.total_in += k3 - n3.next_in_index, n3.next_in_index = k3, s3.write = S2, s3.inflate_flush(n3, r4);
                  r4 = 0, v3--, f3 |= (255 & n3.read_byte(k3++)) << x3, x3 += 8;
                }
                if (f3 >>>= a4, x3 -= a4, e3 += f3 & i[A3], f3 >>>= A3, x3 -= A3, A3 = _2, a4 = u2, A3 + e3 > 258 + (31 & a4) + (a4 >> 5 & 31) || 16 == c3 && A3 < 1) return o3 = null, l3 = 9, n3.msg = "invalid bit length repeat", r4 = t, s3.bitb = f3, s3.bitk = x3, n3.avail_in = v3, n3.total_in += k3 - n3.next_in_index, n3.next_in_index = k3, s3.write = S2, s3.inflate_flush(n3, r4);
                c3 = 16 == c3 ? o3[A3 - 1] : 0;
                do {
                  o3[A3++] = c3;
                } while (0 != --e3);
                _2 = A3;
              }
            }
            if (b3[0] = -1, T3 = [], O2 = [], C2 = [], W2 = [], T3[0] = 9, O2[0] = 6, a4 = u2, a4 = y3.inflate_trees_dynamic(257 + (31 & a4), 1 + (a4 >> 5 & 31), o3, T3, O2, C2, W2, g3, n3), 0 != a4) return a4 == t && (o3 = null, l3 = 9), r4 = a4, s3.bitb = f3, s3.bitk = x3, n3.avail_in = v3, n3.total_in += k3 - n3.next_in_index, n3.next_in_index = k3, s3.write = S2, s3.inflate_flush(n3, r4);
            p3.init(T3[0], O2[0], g3, C2[0], g3, W2[0]), l3 = 6;
          case 6:
            if (s3.bitb = f3, s3.bitk = x3, n3.avail_in = v3, n3.total_in += k3 - n3.next_in_index, n3.next_in_index = k3, s3.write = S2, 1 != (r4 = p3.proc(s3, n3, r4))) return s3.inflate_flush(n3, r4);
            if (r4 = 0, p3.free(n3), k3 = n3.next_in_index, v3 = n3.avail_in, f3 = s3.bitb, x3 = s3.bitk, S2 = s3.write, z3 = S2 < s3.read ? s3.read - S2 - 1 : s3.end - S2, 0 === m3) {
              l3 = 0;
              break;
            }
            l3 = 7;
          case 7:
            if (s3.write = S2, r4 = s3.inflate_flush(n3, r4), S2 = s3.write, z3 = S2 < s3.read ? s3.read - S2 - 1 : s3.end - S2, s3.read != s3.write) return s3.bitb = f3, s3.bitk = x3, n3.avail_in = v3, n3.total_in += k3 - n3.next_in_index, n3.next_in_index = k3, s3.write = S2, s3.inflate_flush(n3, r4);
            l3 = 8;
          case 8:
            return r4 = 1, s3.bitb = f3, s3.bitk = x3, n3.avail_in = v3, n3.total_in += k3 - n3.next_in_index, n3.next_in_index = k3, s3.write = S2, s3.inflate_flush(n3, r4);
          case 9:
            return r4 = t, s3.bitb = f3, s3.bitk = x3, n3.avail_in = v3, n3.total_in += k3 - n3.next_in_index, n3.next_in_index = k3, s3.write = S2, s3.inflate_flush(n3, r4);
          default:
            return r4 = e, s3.bitb = f3, s3.bitk = x3, n3.avail_in = v3, n3.total_in += k3 - n3.next_in_index, n3.next_in_index = k3, s3.write = S2, s3.inflate_flush(n3, r4);
        }
      }
    }, s3.free = function(e3) {
      s3.reset(e3, null), s3.win = null, g3 = null;
    }, s3.set_dictionary = function(e3, t3, n3) {
      s3.win.set(e3.subarray(t3, t3 + n3), 0), s3.read = s3.write = n3;
    }, s3.sync_point = function() {
      return 1 == l3 ? 1 : 0;
    };
  }
  function p() {
    const i3 = this;
    function r3(t3) {
      return t3 && t3.istate ? (t3.total_in = t3.total_out = 0, t3.msg = null, t3.istate.mode = 7, t3.istate.blocks.reset(t3, null), 0) : e;
    }
    i3.mode = 0, i3.method = 0, i3.was = [0], i3.need = 0, i3.marker = 0, i3.wbits = 0, i3.inflateEnd = function(e3) {
      return i3.blocks && i3.blocks.free(e3), i3.blocks = null, 0;
    }, i3.inflateInit = function(t3, n3) {
      return t3.msg = null, i3.blocks = null, n3 < 8 || n3 > 15 ? (i3.inflateEnd(t3), e) : (i3.wbits = n3, t3.istate.blocks = new _(t3, 1 << n3), r3(t3), 0);
    }, i3.inflate = function(i4, r4) {
      let a3, s3;
      if (!i4 || !i4.istate || !i4.next_in) return e;
      const o3 = i4.istate;
      for (r4 = 4 == r4 ? n : 0, a3 = n; ; ) switch (o3.mode) {
        case 0:
          if (0 === i4.avail_in) return a3;
          if (a3 = r4, i4.avail_in--, i4.total_in++, 8 != (15 & (o3.method = i4.read_byte(i4.next_in_index++)))) {
            o3.mode = w, i4.msg = "unknown compression method", o3.marker = 5;
            break;
          }
          if (8 + (o3.method >> 4) > o3.wbits) {
            o3.mode = w, i4.msg = "invalid win size", o3.marker = 5;
            break;
          }
          o3.mode = 1;
        case 1:
          if (0 === i4.avail_in) return a3;
          if (a3 = r4, i4.avail_in--, i4.total_in++, s3 = 255 & i4.read_byte(i4.next_in_index++), ((o3.method << 8) + s3) % 31 != 0) {
            o3.mode = w, i4.msg = "incorrect header check", o3.marker = 5;
            break;
          }
          if (!(32 & s3)) {
            o3.mode = 7;
            break;
          }
          o3.mode = 2;
        case 2:
          if (0 === i4.avail_in) return a3;
          a3 = r4, i4.avail_in--, i4.total_in++, o3.need = (255 & i4.read_byte(i4.next_in_index++)) << 24 & 4278190080, o3.mode = 3;
        case 3:
          if (0 === i4.avail_in) return a3;
          a3 = r4, i4.avail_in--, i4.total_in++, o3.need += (255 & i4.read_byte(i4.next_in_index++)) << 16 & 16711680, o3.mode = 4;
        case 4:
          if (0 === i4.avail_in) return a3;
          a3 = r4, i4.avail_in--, i4.total_in++, o3.need += (255 & i4.read_byte(i4.next_in_index++)) << 8 & 65280, o3.mode = 5;
        case 5:
          return 0 === i4.avail_in ? a3 : (a3 = r4, i4.avail_in--, i4.total_in++, o3.need += 255 & i4.read_byte(i4.next_in_index++), o3.mode = 6, 2);
        case 6:
          return o3.mode = w, i4.msg = "need dictionary", o3.marker = 0, e;
        case 7:
          if (a3 = o3.blocks.proc(i4, a3), a3 == t) {
            o3.mode = w, o3.marker = 0;
            break;
          }
          if (0 == a3 && (a3 = r4), 1 != a3) return a3;
          a3 = r4, o3.blocks.reset(i4, o3.was), o3.mode = 12;
        case 12:
          return i4.avail_in = 0, 1;
        case w:
          return t;
        default:
          return e;
      }
    }, i3.inflateSetDictionary = function(t3, n3, i4) {
      let r4 = 0, a3 = i4;
      if (!t3 || !t3.istate || 6 != t3.istate.mode) return e;
      const s3 = t3.istate;
      return a3 >= 1 << s3.wbits && (a3 = (1 << s3.wbits) - 1, r4 = i4 - a3), s3.blocks.set_dictionary(n3, r4, a3), s3.mode = 7, 0;
    }, i3.inflateSync = function(i4) {
      let a3, s3, o3, l3, c2;
      if (!i4 || !i4.istate) return e;
      const u2 = i4.istate;
      if (u2.mode != w && (u2.mode = w, u2.marker = 0), 0 === (a3 = i4.avail_in)) return n;
      for (s3 = i4.next_in_index, o3 = u2.marker; 0 !== a3 && o3 < 4; ) i4.read_byte(s3) == b[o3] ? o3++ : o3 = 0 !== i4.read_byte(s3) ? 0 : 4 - o3, s3++, a3--;
      return i4.total_in += s3 - i4.next_in_index, i4.next_in_index = s3, i4.avail_in = a3, u2.marker = o3, 4 != o3 ? t : (l3 = i4.total_in, c2 = i4.total_out, r3(i4), i4.total_in = l3, i4.total_out = c2, u2.mode = 7, 0);
    }, i3.inflateSyncPoint = function(t3) {
      return t3 && t3.istate && t3.istate.blocks ? t3.istate.blocks.sync_point() : e;
    };
  }
  function m() {
  }
  function T(e3) {
    const { baseURL: t3, chunkSize: n3, maxWorkers: i3, terminateWorkerTimeout: r3, useCompressionStream: a3, useWebWorkers: s3, Deflate: o3, Inflate: l3, CompressionStream: c2, DecompressionStream: u2, workerScripts: d2 } = e3;
    if (O("baseURL", t3), O("chunkSize", n3), O("maxWorkers", i3), O("terminateWorkerTimeout", r3), O("useCompressionStream", a3), O("useWebWorkers", s3), o3 && (F.CompressionStream = new U(o3)), l3 && (F.DecompressionStream = new U(l3)), O("CompressionStream", c2), O("DecompressionStream", u2), d2 !== S) {
      const { deflate: e4, inflate: t4 } = d2;
      if ((e4 || t4) && (F.workerScripts || (F.workerScripts = {})), e4) {
        if (!Array.isArray(e4)) throw new Error("workerScripts.deflate must be an array");
        F.workerScripts.deflate = e4;
      }
      if (t4) {
        if (!Array.isArray(t4)) throw new Error("workerScripts.inflate must be an array");
        F.workerScripts.inflate = t4;
      }
    }
  }
  function O(e3, t3) {
    t3 !== S && (F[e3] = t3);
  }
  function Z(e3) {
    return V ? crypto.getRandomValues(e3) : B.getRandomValues(e3);
  }
  function _e(e3, t3, n3, i3, r3, a3) {
    const { ctr: s3, hmac: o3, pending: l3 } = e3, c2 = t3.length - r3;
    let u2;
    for (l3.length && (t3 = pe(l3, t3), n3 = function(e4, t4) {
      if (t4 && t4 > e4.length) {
        const n4 = e4;
        (e4 = new Uint8Array(t4)).set(n4, 0);
      }
      return e4;
    }(n3, c2 - c2 % G)), u2 = 0; u2 <= c2 - G; u2 += G) {
      const e4 = ye(se, me(t3, u2, u2 + G));
      a3 && o3.update(e4);
      const r4 = s3.update(e4);
      a3 || o3.update(r4), n3.set(ge(se, r4), u2 + i3);
    }
    return e3.pending = me(t3, u2), n3;
  }
  async function we(e3, t3, n3, i3) {
    e3.password = null;
    const r3 = await async function(e4, t4, n4, i4, r4) {
      if (!ue) return N.importKey(t4);
      try {
        return await re.importKey(e4, t4, n4, i4, r4);
      } catch (e5) {
        return ue = false, N.importKey(t4);
      }
    }("raw", n3, Q, false, Y), a3 = await async function(e4, t4, n4) {
      if (!de) return N.pbkdf2(t4, e4.salt, X.iterations, n4);
      try {
        return await re.deriveBits(e4, t4, n4);
      } catch (i4) {
        return de = false, N.pbkdf2(t4, e4.salt, X.iterations, n4);
      }
    }(Object.assign({ salt: i3 }, X), r3, 8 * (2 * ee[t3] + 2)), s3 = new Uint8Array(a3), o3 = ye(se, me(s3, 0, ee[t3])), l3 = ye(se, me(s3, ee[t3], 2 * ee[t3])), c2 = me(s3, 2 * ee[t3]);
    return Object.assign(e3, { keys: { key: o3, authentication: l3, passwordVerification: c2 }, ctr: new le(new oe(o3), Array.from(ne)), hmac: new ce(l3) }), c2;
  }
  function be(e3, t3) {
    return t3 === S ? function(e4) {
      if (typeof TextEncoder == z) {
        e4 = unescape(encodeURIComponent(e4));
        const t4 = new Uint8Array(e4.length);
        for (let n3 = 0; n3 < t4.length; n3++) t4[n3] = e4.charCodeAt(n3);
        return t4;
      }
      return new TextEncoder().encode(e4);
    }(e3) : t3;
  }
  function pe(e3, t3) {
    let n3 = e3;
    return e3.length + t3.length && (n3 = new Uint8Array(e3.length + t3.length), n3.set(e3, 0), n3.set(t3, e3.length)), n3;
  }
  function me(e3, t3, n3) {
    return e3.subarray(t3, n3);
  }
  function ge(e3, t3) {
    return e3.fromBits(t3);
  }
  function ye(e3, t3) {
    return e3.toBits(t3);
  }
  function Se(e3, t3) {
    const n3 = new Uint8Array(t3.length);
    for (let i3 = 0; i3 < t3.length; i3++) n3[i3] = De(e3) ^ t3[i3], Ue(e3, n3[i3]);
    return n3;
  }
  function ze(e3, t3) {
    const n3 = new Uint8Array(t3.length);
    for (let i3 = 0; i3 < t3.length; i3++) n3[i3] = De(e3) ^ t3[i3], Ue(e3, t3[i3]);
    return n3;
  }
  function Ae(e3, t3) {
    const n3 = [305419896, 591751049, 878082192];
    Object.assign(e3, { keys: n3, crcKey0: new W(n3[0]), crcKey2: new W(n3[2]) });
    for (let n4 = 0; n4 < t3.length; n4++) Ue(e3, t3.charCodeAt(n4));
  }
  function Ue(e3, t3) {
    let [n3, i3, r3] = e3.keys;
    e3.crcKey0.append([t3]), n3 = ~e3.crcKey0.get(), i3 = Fe(Math.imul(Fe(i3 + Ee(n3)), 134775813) + 1), e3.crcKey2.append([i3 >>> 24]), r3 = ~e3.crcKey2.get(), e3.keys = [n3, i3, r3];
  }
  function De(e3) {
    const t3 = 2 | e3.keys[2];
    return Ee(Math.imul(t3, 1 ^ t3) >>> 8);
  }
  function Ee(e3) {
    return 255 & e3;
  }
  function Fe(e3) {
    return 4294967295 & e3;
  }
  function We(e3) {
    return Le(e3, new TransformStream({ transform(e4, t3) {
      e4 && e4.length && t3.enqueue(e4);
    } }));
  }
  function je(e3, t3, n3) {
    t3 = Le(t3, new TransformStream({ flush: n3 })), Object.defineProperty(e3, "readable", { get: () => t3 });
  }
  function Me(e3, t3, n3, i3, r3) {
    try {
      e3 = Le(e3, new (t3 && i3 ? i3 : r3)(Te, n3));
    } catch (i4) {
      if (!t3) return e3;
      try {
        e3 = Le(e3, new r3(Te, n3));
      } catch (t4) {
        return e3;
      }
    }
    return e3;
  }
  function Le(e3, t3) {
    return e3.pipeThrough(t3);
  }
  async function Je(e3, ...t3) {
    try {
      await e3(...t3);
    } catch (e4) {
    }
  }
  function Qe(e3, t3) {
    return { run: () => async function({ options: e4, readable: t4, writable: n3, onTaskFinished: i3 }, r3) {
      try {
        const i4 = new qe(e4, r3);
        await t4.pipeThrough(i4).pipeTo(n3, { preventClose: true, preventAbort: true });
        const { signature: a3, inputSize: s3, outputSize: o3 } = i4;
        return { signature: a3, inputSize: s3, outputSize: o3 };
      } finally {
        i3();
      }
    }(e3, t3) };
  }
  function Xe(e3, t3) {
    const { baseURL: n3, chunkSize: i3 } = t3;
    if (!e3.interface) {
      let r3;
      try {
        r3 = function(e4, t4, n4) {
          const i4 = { type: "module" };
          let r4, a3;
          typeof e4 == A && (e4 = e4());
          try {
            r4 = new URL(e4, t4);
          } catch (t5) {
            r4 = e4;
          }
          if (Ye) try {
            a3 = new Worker(r4);
          } catch (e5) {
            Ye = false, a3 = new Worker(r4, i4);
          }
          else a3 = new Worker(r4, i4);
          return a3.addEventListener(Pe, (e5) => async function({ data: e6 }, t5) {
            const { type: n5, value: i5, messageId: r5, result: a4, error: s3 } = e6, { reader: o3, writer: l3, resolveResult: c2, rejectResult: u2, onTaskFinished: d2 } = t5;
            try {
              if (s3) {
                const { message: e7, stack: t6, code: n6, name: i6 } = s3, r6 = new Error(e7);
                Object.assign(r6, { stack: t6, code: n6, name: i6 }), f3(r6);
              } else {
                if (n5 == Be) {
                  const { value: e7, done: n6 } = await o3.read();
                  et({ type: Ie, value: e7, done: n6, messageId: r5 }, t5);
                }
                n5 == Ie && (await l3.ready, await l3.write(new Uint8Array(i5)), et({ type: "ack", messageId: r5 }, t5)), n5 == Ne && f3(null, a4);
              }
            } catch (s4) {
              et({ type: Ne, messageId: r5 }, t5), f3(s4);
            }
            function f3(e7, t6) {
              e7 ? u2(e7) : c2(t6), l3 && l3.releaseLock(), d2();
            }
          }(e5, n4)), a3;
        }(e3.scripts[0], n3, e3);
      } catch (n4) {
        return Ke = false, Qe(e3, t3);
      }
      Object.assign(e3, { worker: r3, interface: { run: () => async function(e4, t4) {
        let n4, i4;
        const r4 = new Promise((e5, t5) => {
          n4 = e5, i4 = t5;
        });
        Object.assign(e4, { reader: null, writer: null, resolveResult: n4, rejectResult: i4, result: r4 });
        const { readable: a3, options: s3, scripts: o3 } = e4, { writable: l3, closed: c2 } = function(e5) {
          let t5;
          const n5 = new Promise((e6) => t5 = e6), i5 = new WritableStream({ async write(t6) {
            const n6 = e5.getWriter();
            await n6.ready, await n6.write(t6), n6.releaseLock();
          }, close() {
            t5();
          }, abort: (t6) => e5.getWriter().abort(t6) });
          return { writable: i5, closed: n5 };
        }(e4.writable), u2 = et({ type: Re, scripts: o3.slice(1), options: s3, config: t4, readable: a3, writable: l3 }, e4);
        u2 || Object.assign(e4, { reader: a3.getReader(), writer: l3.getWriter() });
        const d2 = await r4;
        u2 || await l3.getWriter().close();
        return await c2, d2;
      }(e3, { chunkSize: i3 }) } });
    }
    return e3.interface;
  }
  function et(e3, { worker: t3, writer: n3, onTaskFinished: i3, transferStreams: r3 }) {
    try {
      const { value: n4, readable: i4, writable: a3 } = e3, s3 = [];
      if (n4 && (n4.byteLength < n4.buffer.byteLength ? e3.value = n4.buffer.slice(0, n4.byteLength) : e3.value = n4.buffer, s3.push(e3.value)), r3 && $e ? (i4 && s3.push(i4), a3 && s3.push(a3)) : e3.readable = e3.writable = null, s3.length) try {
        return t3.postMessage(e3, s3), true;
      } catch (n5) {
        $e = false, e3.readable = e3.writable = null, t3.postMessage(e3);
      }
      else t3.postMessage(e3);
    } catch (e4) {
      throw n3 && n3.releaseLock(), i3(), e4;
    }
  }
  async function rt(e3, t3) {
    const { options: n3, config: i3 } = t3, { transferStreams: r3, useWebWorkers: a3, useCompressionStream: s3, codecType: o3, compressed: l3, signed: c2, encrypted: u2 } = n3, { workerScripts: d2, maxWorkers: f3 } = i3;
    t3.transferStreams = r3 || r3 === S;
    const h3 = !(l3 || c2 || u2 || t3.transferStreams);
    return t3.useWebWorkers = !h3 && (a3 || a3 === S && i3.useWebWorkers), t3.scripts = t3.useWebWorkers && d2 ? d2[o3] : [], n3.useCompressionStream = s3 || s3 === S && i3.useCompressionStream, (await async function() {
      const n4 = tt.find((e4) => !e4.busy);
      if (n4) return at(n4), new Ze(n4, e3, t3, _2);
      if (tt.length < f3) {
        const n5 = { indexWorker: it };
        return it++, tt.push(n5), new Ze(n5, e3, t3, _2);
      }
      return new Promise((n5) => nt.push({ resolve: n5, stream: e3, workerOptions: t3 }));
    }()).run();
    function _2(e4) {
      if (nt.length) {
        const [{ resolve: t4, stream: n4, workerOptions: i4 }] = nt.splice(0, 1);
        t4(new Ze(e4, n4, i4, _2));
      } else e4.worker ? (at(e4), function(e5, t4) {
        const { config: n4 } = t4, { terminateWorkerTimeout: i4 } = n4;
        Number.isFinite(i4) && i4 >= 0 && (e5.terminated ? e5.terminated = false : e5.terminateTimeout = setTimeout(async () => {
          tt = tt.filter((t5) => t5 != e5);
          try {
            await e5.terminate();
          } catch (e6) {
          }
        }, i4));
      }(e4, t3)) : tt = tt.filter((t4) => t4 != e4);
    }
  }
  function at(e3) {
    const { terminateTimeout: t3 } = e3;
    t3 && (clearTimeout(t3), e3.terminateTimeout = null);
  }
  async function wt(e3, t3) {
    if (!e3.init || e3.initialized) return Promise.resolve();
    await e3.init(t3);
  }
  function bt(e3) {
    return Array.isArray(e3) && (e3 = new ht(e3)), e3 instanceof ReadableStream && (e3 = { readable: e3 }), e3;
  }
  function pt(e3, t3, n3, i3) {
    return e3.readUint8Array(t3, n3, i3);
  }
  function yt(e3, t3) {
    return t3 && "cp437" == t3.trim().toLowerCase() ? function(e4) {
      if (gt) {
        let t4 = "";
        for (let n3 = 0; n3 < e4.length; n3++) t4 += mt[e4[n3]];
        return t4;
      }
      return new TextDecoder().decode(e4);
    }(e3) : new TextDecoder(t3).decode(e3);
  }
  function Zt(e3, t3, n3) {
    const i3 = e3.rawBitFlag = en(t3, n3 + 2), r3 = !(1 & ~i3), a3 = tn(t3, n3 + 6);
    Object.assign(e3, { encrypted: r3, version: en(t3, n3), bitFlag: { level: (6 & i3) >> 1, dataDescriptor: !(8 & ~i3), languageEncodingFlag: !(2048 & ~i3) }, rawLastModDate: a3, lastModDate: Xt(a3), filenameLength: en(t3, n3 + 22), extraFieldLength: en(t3, n3 + 24) });
  }
  function Gt(e3, t3, n3, i3, r3) {
    const { rawExtraField: a3 } = t3, s3 = t3.extraField = /* @__PURE__ */ new Map(), o3 = rn(new Uint8Array(a3));
    let l3 = 0;
    try {
      for (; l3 < a3.length; ) {
        const e4 = en(o3, l3), t4 = en(o3, l3 + 2);
        s3.set(e4, { type: e4, data: a3.slice(l3 + 4, l3 + 4 + t4) }), l3 += 4 + t4;
      }
    } catch (e4) {
    }
    const c2 = en(n3, i3 + 4);
    Object.assign(t3, { signature: tn(n3, i3 + 10), uncompressedSize: tn(n3, i3 + 18), compressedSize: tn(n3, i3 + 14) });
    const u2 = s3.get(1);
    u2 && (!function(e4, t4) {
      t4.zip64 = true;
      const n4 = rn(e4.data), i4 = Vt.filter(([e5, n5]) => t4[e5] == n5);
      for (let r4 = 0, a4 = 0; r4 < i4.length; r4++) {
        const [s4, o4] = i4[r4];
        if (t4[s4] == o4) {
          const i5 = qt[o4];
          t4[s4] = e4[s4] = i5.getValue(n4, a4), a4 += i5.bytes;
        } else if (e4[s4]) throw new Error(Pt);
      }
    }(u2, t3), t3.extraFieldZip64 = u2);
    const d2 = s3.get(28789);
    d2 && (Jt(d2, xt, kt, t3, e3), t3.extraFieldUnicodePath = d2);
    const f3 = s3.get(25461);
    f3 && (Jt(f3, vt, St, t3, e3), t3.extraFieldUnicodeComment = f3);
    const h3 = s3.get(39169);
    h3 ? (!function(e4, t4, n4) {
      const i4 = rn(e4.data), r4 = $t(i4, 4);
      Object.assign(e4, { vendorVersion: $t(i4, 0), vendorId: $t(i4, 2), strength: r4, originalCompressionMethod: n4, compressionMethod: en(i4, 5) }), t4.compressionMethod = e4.compressionMethod;
    }(h3, t3, c2), t3.extraFieldAES = h3) : t3.compressionMethod = c2;
    const _2 = s3.get(10);
    _2 && (!function(e4, t4) {
      const n4 = rn(e4.data);
      let i4, r4 = 4;
      try {
        for (; r4 < e4.data.length && !i4; ) {
          const t5 = en(n4, r4), a4 = en(n4, r4 + 2);
          1 == t5 && (i4 = e4.data.slice(r4 + 4, r4 + 4 + a4)), r4 += 4 + a4;
        }
      } catch (e5) {
      }
      try {
        if (i4 && 24 == i4.length) {
          const n5 = rn(i4), r5 = n5.getBigUint64(0, true), a4 = n5.getBigUint64(8, true), s4 = n5.getBigUint64(16, true);
          Object.assign(e4, { rawLastModDate: r5, rawLastAccessDate: a4, rawCreationDate: s4 });
          const o4 = Yt(r5), l4 = Yt(a4), c3 = { lastModDate: o4, lastAccessDate: l4, creationDate: Yt(s4) };
          Object.assign(e4, c3), Object.assign(t4, c3);
        }
      } catch (e5) {
      }
    }(_2, t3), t3.extraFieldNTFS = _2);
    const w2 = s3.get(21589);
    w2 && (!function(e4, t4, n4) {
      const i4 = rn(e4.data), r4 = $t(i4, 0), a4 = [], s4 = [];
      n4 ? (1 & ~r4 || (a4.push(Et), s4.push(Ft)), 2 & ~r4 || (a4.push(Tt), s4.push(Ot)), 4 & ~r4 || (a4.push(Ct), s4.push(Wt))) : e4.data.length >= 5 && (a4.push(Et), s4.push(Ft));
      let o4 = 1;
      a4.forEach((n5, r5) => {
        if (e4.data.length >= o4 + 4) {
          const a5 = tn(i4, o4);
          t4[n5] = e4[n5] = new Date(1e3 * a5);
          const l4 = s4[r5];
          e4[l4] = a5;
        }
        o4 += 4;
      });
    }(w2, t3, r3), t3.extraFieldExtendedTimestamp = w2);
    const b3 = s3.get(6534);
    b3 && (t3.extraFieldUSDZ = b3);
  }
  function Jt(e3, t3, n3, i3, r3) {
    const a3 = rn(e3.data), s3 = new W();
    s3.append(r3[n3]);
    const o3 = rn(new Uint8Array(4));
    o3.setUint32(0, s3.get(), true);
    const l3 = tn(a3, 1);
    Object.assign(e3, { version: $t(a3, 0), [t3]: yt(e3.data.subarray(5)), valid: !r3.bitFlag.languageEncodingFlag && l3 == tn(o3, 0) }), e3.valid && (i3[t3] = e3[t3], i3[t3 + "UTF8"] = true);
  }
  function Qt(e3, t3, n3) {
    return t3[n3] === S ? e3.options[n3] : t3[n3];
  }
  function Xt(e3) {
    const t3 = (4294901760 & e3) >> 16, n3 = 65535 & e3;
    try {
      return new Date(1980 + ((65024 & t3) >> 9), ((480 & t3) >> 5) - 1, 31 & t3, (63488 & n3) >> 11, (2016 & n3) >> 5, 2 * (31 & n3), 0);
    } catch (e4) {
    }
  }
  function Yt(e3) {
    return new Date(Number(e3 / BigInt(1e4) - BigInt(116444736e5)));
  }
  function $t(e3, t3) {
    return e3.getUint8(t3);
  }
  function en(e3, t3) {
    return e3.getUint16(t3, true);
  }
  function tn(e3, t3) {
    return e3.getUint32(t3, true);
  }
  function nn(e3, t3) {
    return Number(e3.getBigUint64(t3, true));
  }
  function rn(e3) {
    return new DataView(e3.buffer);
  }
  var e, t, n, i, r, a, s, o, l, c, u, h, w, b, g, y, x, k, v, S, z, A, U, D, E, F, C, W, j, M, L, P, R, B, I, N, V, q, H, K, G, J, Q, X, Y, $, ee, te, ne, ie, re, ae, se, oe, le, ce, ue, de, fe, he, xe, ke, ve, Te, Oe, Ce, Pe, Re, Be, Ie, Ne, Ve, qe, He, Ke, Ze, Ge, Ye, $e, tt, nt, it, st, ot, lt, ct, ut, dt, ft, ht, _t, mt, gt, xt, kt, vt, St, zt, At, Ut, Dt, Et, Ft, Tt, Ot, Ct, Wt, jt, Mt, Lt, Pt, Rt, Bt, It, Nt, Vt, qt, Ht, Kt;
  var init_zip = __esm({
    "src/libs/foliate-js/vendor/zip.js"() {
      "use strict";
      e = -2;
      t = -3;
      n = -5;
      i = [0, 1, 3, 7, 15, 31, 63, 127, 255, 511, 1023, 2047, 4095, 8191, 16383, 32767, 65535];
      r = [96, 7, 256, 0, 8, 80, 0, 8, 16, 84, 8, 115, 82, 7, 31, 0, 8, 112, 0, 8, 48, 0, 9, 192, 80, 7, 10, 0, 8, 96, 0, 8, 32, 0, 9, 160, 0, 8, 0, 0, 8, 128, 0, 8, 64, 0, 9, 224, 80, 7, 6, 0, 8, 88, 0, 8, 24, 0, 9, 144, 83, 7, 59, 0, 8, 120, 0, 8, 56, 0, 9, 208, 81, 7, 17, 0, 8, 104, 0, 8, 40, 0, 9, 176, 0, 8, 8, 0, 8, 136, 0, 8, 72, 0, 9, 240, 80, 7, 4, 0, 8, 84, 0, 8, 20, 85, 8, 227, 83, 7, 43, 0, 8, 116, 0, 8, 52, 0, 9, 200, 81, 7, 13, 0, 8, 100, 0, 8, 36, 0, 9, 168, 0, 8, 4, 0, 8, 132, 0, 8, 68, 0, 9, 232, 80, 7, 8, 0, 8, 92, 0, 8, 28, 0, 9, 152, 84, 7, 83, 0, 8, 124, 0, 8, 60, 0, 9, 216, 82, 7, 23, 0, 8, 108, 0, 8, 44, 0, 9, 184, 0, 8, 12, 0, 8, 140, 0, 8, 76, 0, 9, 248, 80, 7, 3, 0, 8, 82, 0, 8, 18, 85, 8, 163, 83, 7, 35, 0, 8, 114, 0, 8, 50, 0, 9, 196, 81, 7, 11, 0, 8, 98, 0, 8, 34, 0, 9, 164, 0, 8, 2, 0, 8, 130, 0, 8, 66, 0, 9, 228, 80, 7, 7, 0, 8, 90, 0, 8, 26, 0, 9, 148, 84, 7, 67, 0, 8, 122, 0, 8, 58, 0, 9, 212, 82, 7, 19, 0, 8, 106, 0, 8, 42, 0, 9, 180, 0, 8, 10, 0, 8, 138, 0, 8, 74, 0, 9, 244, 80, 7, 5, 0, 8, 86, 0, 8, 22, 192, 8, 0, 83, 7, 51, 0, 8, 118, 0, 8, 54, 0, 9, 204, 81, 7, 15, 0, 8, 102, 0, 8, 38, 0, 9, 172, 0, 8, 6, 0, 8, 134, 0, 8, 70, 0, 9, 236, 80, 7, 9, 0, 8, 94, 0, 8, 30, 0, 9, 156, 84, 7, 99, 0, 8, 126, 0, 8, 62, 0, 9, 220, 82, 7, 27, 0, 8, 110, 0, 8, 46, 0, 9, 188, 0, 8, 14, 0, 8, 142, 0, 8, 78, 0, 9, 252, 96, 7, 256, 0, 8, 81, 0, 8, 17, 85, 8, 131, 82, 7, 31, 0, 8, 113, 0, 8, 49, 0, 9, 194, 80, 7, 10, 0, 8, 97, 0, 8, 33, 0, 9, 162, 0, 8, 1, 0, 8, 129, 0, 8, 65, 0, 9, 226, 80, 7, 6, 0, 8, 89, 0, 8, 25, 0, 9, 146, 83, 7, 59, 0, 8, 121, 0, 8, 57, 0, 9, 210, 81, 7, 17, 0, 8, 105, 0, 8, 41, 0, 9, 178, 0, 8, 9, 0, 8, 137, 0, 8, 73, 0, 9, 242, 80, 7, 4, 0, 8, 85, 0, 8, 21, 80, 8, 258, 83, 7, 43, 0, 8, 117, 0, 8, 53, 0, 9, 202, 81, 7, 13, 0, 8, 101, 0, 8, 37, 0, 9, 170, 0, 8, 5, 0, 8, 133, 0, 8, 69, 0, 9, 234, 80, 7, 8, 0, 8, 93, 0, 8, 29, 0, 9, 154, 84, 7, 83, 0, 8, 125, 0, 8, 61, 0, 9, 218, 82, 7, 23, 0, 8, 109, 0, 8, 45, 0, 9, 186, 0, 8, 13, 0, 8, 141, 0, 8, 77, 0, 9, 250, 80, 7, 3, 0, 8, 83, 0, 8, 19, 85, 8, 195, 83, 7, 35, 0, 8, 115, 0, 8, 51, 0, 9, 198, 81, 7, 11, 0, 8, 99, 0, 8, 35, 0, 9, 166, 0, 8, 3, 0, 8, 131, 0, 8, 67, 0, 9, 230, 80, 7, 7, 0, 8, 91, 0, 8, 27, 0, 9, 150, 84, 7, 67, 0, 8, 123, 0, 8, 59, 0, 9, 214, 82, 7, 19, 0, 8, 107, 0, 8, 43, 0, 9, 182, 0, 8, 11, 0, 8, 139, 0, 8, 75, 0, 9, 246, 80, 7, 5, 0, 8, 87, 0, 8, 23, 192, 8, 0, 83, 7, 51, 0, 8, 119, 0, 8, 55, 0, 9, 206, 81, 7, 15, 0, 8, 103, 0, 8, 39, 0, 9, 174, 0, 8, 7, 0, 8, 135, 0, 8, 71, 0, 9, 238, 80, 7, 9, 0, 8, 95, 0, 8, 31, 0, 9, 158, 84, 7, 99, 0, 8, 127, 0, 8, 63, 0, 9, 222, 82, 7, 27, 0, 8, 111, 0, 8, 47, 0, 9, 190, 0, 8, 15, 0, 8, 143, 0, 8, 79, 0, 9, 254, 96, 7, 256, 0, 8, 80, 0, 8, 16, 84, 8, 115, 82, 7, 31, 0, 8, 112, 0, 8, 48, 0, 9, 193, 80, 7, 10, 0, 8, 96, 0, 8, 32, 0, 9, 161, 0, 8, 0, 0, 8, 128, 0, 8, 64, 0, 9, 225, 80, 7, 6, 0, 8, 88, 0, 8, 24, 0, 9, 145, 83, 7, 59, 0, 8, 120, 0, 8, 56, 0, 9, 209, 81, 7, 17, 0, 8, 104, 0, 8, 40, 0, 9, 177, 0, 8, 8, 0, 8, 136, 0, 8, 72, 0, 9, 241, 80, 7, 4, 0, 8, 84, 0, 8, 20, 85, 8, 227, 83, 7, 43, 0, 8, 116, 0, 8, 52, 0, 9, 201, 81, 7, 13, 0, 8, 100, 0, 8, 36, 0, 9, 169, 0, 8, 4, 0, 8, 132, 0, 8, 68, 0, 9, 233, 80, 7, 8, 0, 8, 92, 0, 8, 28, 0, 9, 153, 84, 7, 83, 0, 8, 124, 0, 8, 60, 0, 9, 217, 82, 7, 23, 0, 8, 108, 0, 8, 44, 0, 9, 185, 0, 8, 12, 0, 8, 140, 0, 8, 76, 0, 9, 249, 80, 7, 3, 0, 8, 82, 0, 8, 18, 85, 8, 163, 83, 7, 35, 0, 8, 114, 0, 8, 50, 0, 9, 197, 81, 7, 11, 0, 8, 98, 0, 8, 34, 0, 9, 165, 0, 8, 2, 0, 8, 130, 0, 8, 66, 0, 9, 229, 80, 7, 7, 0, 8, 90, 0, 8, 26, 0, 9, 149, 84, 7, 67, 0, 8, 122, 0, 8, 58, 0, 9, 213, 82, 7, 19, 0, 8, 106, 0, 8, 42, 0, 9, 181, 0, 8, 10, 0, 8, 138, 0, 8, 74, 0, 9, 245, 80, 7, 5, 0, 8, 86, 0, 8, 22, 192, 8, 0, 83, 7, 51, 0, 8, 118, 0, 8, 54, 0, 9, 205, 81, 7, 15, 0, 8, 102, 0, 8, 38, 0, 9, 173, 0, 8, 6, 0, 8, 134, 0, 8, 70, 0, 9, 237, 80, 7, 9, 0, 8, 94, 0, 8, 30, 0, 9, 157, 84, 7, 99, 0, 8, 126, 0, 8, 62, 0, 9, 221, 82, 7, 27, 0, 8, 110, 0, 8, 46, 0, 9, 189, 0, 8, 14, 0, 8, 142, 0, 8, 78, 0, 9, 253, 96, 7, 256, 0, 8, 81, 0, 8, 17, 85, 8, 131, 82, 7, 31, 0, 8, 113, 0, 8, 49, 0, 9, 195, 80, 7, 10, 0, 8, 97, 0, 8, 33, 0, 9, 163, 0, 8, 1, 0, 8, 129, 0, 8, 65, 0, 9, 227, 80, 7, 6, 0, 8, 89, 0, 8, 25, 0, 9, 147, 83, 7, 59, 0, 8, 121, 0, 8, 57, 0, 9, 211, 81, 7, 17, 0, 8, 105, 0, 8, 41, 0, 9, 179, 0, 8, 9, 0, 8, 137, 0, 8, 73, 0, 9, 243, 80, 7, 4, 0, 8, 85, 0, 8, 21, 80, 8, 258, 83, 7, 43, 0, 8, 117, 0, 8, 53, 0, 9, 203, 81, 7, 13, 0, 8, 101, 0, 8, 37, 0, 9, 171, 0, 8, 5, 0, 8, 133, 0, 8, 69, 0, 9, 235, 80, 7, 8, 0, 8, 93, 0, 8, 29, 0, 9, 155, 84, 7, 83, 0, 8, 125, 0, 8, 61, 0, 9, 219, 82, 7, 23, 0, 8, 109, 0, 8, 45, 0, 9, 187, 0, 8, 13, 0, 8, 141, 0, 8, 77, 0, 9, 251, 80, 7, 3, 0, 8, 83, 0, 8, 19, 85, 8, 195, 83, 7, 35, 0, 8, 115, 0, 8, 51, 0, 9, 199, 81, 7, 11, 0, 8, 99, 0, 8, 35, 0, 9, 167, 0, 8, 3, 0, 8, 131, 0, 8, 67, 0, 9, 231, 80, 7, 7, 0, 8, 91, 0, 8, 27, 0, 9, 151, 84, 7, 67, 0, 8, 123, 0, 8, 59, 0, 9, 215, 82, 7, 19, 0, 8, 107, 0, 8, 43, 0, 9, 183, 0, 8, 11, 0, 8, 139, 0, 8, 75, 0, 9, 247, 80, 7, 5, 0, 8, 87, 0, 8, 23, 192, 8, 0, 83, 7, 51, 0, 8, 119, 0, 8, 55, 0, 9, 207, 81, 7, 15, 0, 8, 103, 0, 8, 39, 0, 9, 175, 0, 8, 7, 0, 8, 135, 0, 8, 71, 0, 9, 239, 80, 7, 9, 0, 8, 95, 0, 8, 31, 0, 9, 159, 84, 7, 99, 0, 8, 127, 0, 8, 63, 0, 9, 223, 82, 7, 27, 0, 8, 111, 0, 8, 47, 0, 9, 191, 0, 8, 15, 0, 8, 143, 0, 8, 79, 0, 9, 255];
      a = [80, 5, 1, 87, 5, 257, 83, 5, 17, 91, 5, 4097, 81, 5, 5, 89, 5, 1025, 85, 5, 65, 93, 5, 16385, 80, 5, 3, 88, 5, 513, 84, 5, 33, 92, 5, 8193, 82, 5, 9, 90, 5, 2049, 86, 5, 129, 192, 5, 24577, 80, 5, 2, 87, 5, 385, 83, 5, 25, 91, 5, 6145, 81, 5, 7, 89, 5, 1537, 85, 5, 97, 93, 5, 24577, 80, 5, 4, 88, 5, 769, 84, 5, 49, 92, 5, 12289, 82, 5, 13, 90, 5, 3073, 86, 5, 193, 192, 5, 24577];
      s = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0];
      o = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 112, 112];
      l = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
      c = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
      u = 15;
      d.inflate_trees_fixed = function(e3, t3, n3, i3) {
        return e3[0] = 9, t3[0] = 5, n3[0] = r, i3[0] = a, 0;
      };
      h = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
      w = 13;
      b = [0, 0, 255, 255];
      m.prototype = { inflateInit(e3) {
        const t3 = this;
        return t3.istate = new p(), e3 || (e3 = 15), t3.istate.inflateInit(t3, e3);
      }, inflate(t3) {
        const n3 = this;
        return n3.istate ? n3.istate.inflate(n3, t3) : e;
      }, inflateEnd() {
        const t3 = this;
        if (!t3.istate) return e;
        const n3 = t3.istate.inflateEnd(t3);
        return t3.istate = null, n3;
      }, inflateSync() {
        const t3 = this;
        return t3.istate ? t3.istate.inflateSync(t3) : e;
      }, inflateSetDictionary(t3, n3) {
        const i3 = this;
        return i3.istate ? i3.istate.inflateSetDictionary(i3, t3, n3) : e;
      }, read_byte(e3) {
        return this.next_in[e3];
      }, read_buf(e3, t3) {
        return this.next_in.subarray(e3, e3 + t3);
      } };
      g = 4294967295;
      y = 65535;
      x = 33639248;
      k = 101075792;
      v = 22;
      S = void 0;
      z = "undefined";
      A = "function";
      U = class {
        constructor(e3) {
          return class extends TransformStream {
            constructor(t3, n3) {
              const i3 = new e3(n3);
              super({ transform(e4, t4) {
                t4.enqueue(i3.append(e4));
              }, flush(e4) {
                const t4 = i3.flush();
                t4 && e4.enqueue(t4);
              } });
            }
          };
        }
      };
      D = 2;
      try {
        typeof navigator != z && navigator.hardwareConcurrency && (D = navigator.hardwareConcurrency);
      } catch (e3) {
      }
      E = { chunkSize: 524288, maxWorkers: D, terminateWorkerTimeout: 5e3, useWebWorkers: true, useCompressionStream: true, workerScripts: S, CompressionStreamNative: typeof CompressionStream != z && CompressionStream, DecompressionStreamNative: typeof DecompressionStream != z && DecompressionStream };
      F = Object.assign({}, E);
      C = [];
      for (let e3 = 0; e3 < 256; e3++) {
        let t3 = e3;
        for (let e4 = 0; e4 < 8; e4++) 1 & t3 ? t3 = t3 >>> 1 ^ 3988292384 : t3 >>>= 1;
        C[e3] = t3;
      }
      W = class {
        constructor(e3) {
          this.crc = e3 || -1;
        }
        append(e3) {
          let t3 = 0 | this.crc;
          for (let n3 = 0, i3 = 0 | e3.length; n3 < i3; n3++) t3 = t3 >>> 8 ^ C[255 & (t3 ^ e3[n3])];
          this.crc = t3;
        }
        get() {
          return ~this.crc;
        }
      };
      j = class extends TransformStream {
        constructor() {
          let e3;
          const t3 = new W();
          super({ transform(e4, n3) {
            t3.append(e4), n3.enqueue(e4);
          }, flush() {
            const n3 = new Uint8Array(4);
            new DataView(n3.buffer).setUint32(0, t3.get()), e3.value = n3;
          } }), e3 = this;
        }
      };
      M = { concat(e3, t3) {
        if (0 === e3.length || 0 === t3.length) return e3.concat(t3);
        const n3 = e3[e3.length - 1], i3 = M.getPartial(n3);
        return 32 === i3 ? e3.concat(t3) : M._shiftRight(t3, i3, 0 | n3, e3.slice(0, e3.length - 1));
      }, bitLength(e3) {
        const t3 = e3.length;
        if (0 === t3) return 0;
        const n3 = e3[t3 - 1];
        return 32 * (t3 - 1) + M.getPartial(n3);
      }, clamp(e3, t3) {
        if (32 * e3.length < t3) return e3;
        const n3 = (e3 = e3.slice(0, Math.ceil(t3 / 32))).length;
        return t3 &= 31, n3 > 0 && t3 && (e3[n3 - 1] = M.partial(t3, e3[n3 - 1] & 2147483648 >> t3 - 1, 1)), e3;
      }, partial: (e3, t3, n3) => 32 === e3 ? t3 : (n3 ? 0 | t3 : t3 << 32 - e3) + 1099511627776 * e3, getPartial: (e3) => Math.round(e3 / 1099511627776) || 32, _shiftRight(e3, t3, n3, i3) {
        for (void 0 === i3 && (i3 = []); t3 >= 32; t3 -= 32) i3.push(n3), n3 = 0;
        if (0 === t3) return i3.concat(e3);
        for (let r4 = 0; r4 < e3.length; r4++) i3.push(n3 | e3[r4] >>> t3), n3 = e3[r4] << 32 - t3;
        const r3 = e3.length ? e3[e3.length - 1] : 0, a3 = M.getPartial(r3);
        return i3.push(M.partial(t3 + a3 & 31, t3 + a3 > 32 ? n3 : i3.pop(), 1)), i3;
      } };
      L = { bytes: { fromBits(e3) {
        const t3 = M.bitLength(e3) / 8, n3 = new Uint8Array(t3);
        let i3;
        for (let r3 = 0; r3 < t3; r3++) 3 & r3 || (i3 = e3[r3 / 4]), n3[r3] = i3 >>> 24, i3 <<= 8;
        return n3;
      }, toBits(e3) {
        const t3 = [];
        let n3, i3 = 0;
        for (n3 = 0; n3 < e3.length; n3++) i3 = i3 << 8 | e3[n3], 3 & ~n3 || (t3.push(i3), i3 = 0);
        return 3 & n3 && t3.push(M.partial(8 * (3 & n3), i3)), t3;
      } } };
      P = { sha1: class {
        constructor(e3) {
          const t3 = this;
          t3.blockSize = 512, t3._init = [1732584193, 4023233417, 2562383102, 271733878, 3285377520], t3._key = [1518500249, 1859775393, 2400959708, 3395469782], e3 ? (t3._h = e3._h.slice(0), t3._buffer = e3._buffer.slice(0), t3._length = e3._length) : t3.reset();
        }
        reset() {
          const e3 = this;
          return e3._h = e3._init.slice(0), e3._buffer = [], e3._length = 0, e3;
        }
        update(e3) {
          const t3 = this;
          "string" == typeof e3 && (e3 = L.utf8String.toBits(e3));
          const n3 = t3._buffer = M.concat(t3._buffer, e3), i3 = t3._length, r3 = t3._length = i3 + M.bitLength(e3);
          if (r3 > 9007199254740991) throw new Error("Cannot hash more than 2^53 - 1 bits");
          const a3 = new Uint32Array(n3);
          let s3 = 0;
          for (let e4 = t3.blockSize + i3 - (t3.blockSize + i3 & t3.blockSize - 1); e4 <= r3; e4 += t3.blockSize) t3._block(a3.subarray(16 * s3, 16 * (s3 + 1))), s3 += 1;
          return n3.splice(0, 16 * s3), t3;
        }
        finalize() {
          const e3 = this;
          let t3 = e3._buffer;
          const n3 = e3._h;
          t3 = M.concat(t3, [M.partial(1, 1)]);
          for (let e4 = t3.length + 2; 15 & e4; e4++) t3.push(0);
          for (t3.push(Math.floor(e3._length / 4294967296)), t3.push(0 | e3._length); t3.length; ) e3._block(t3.splice(0, 16));
          return e3.reset(), n3;
        }
        _f(e3, t3, n3, i3) {
          return e3 <= 19 ? t3 & n3 | ~t3 & i3 : e3 <= 39 ? t3 ^ n3 ^ i3 : e3 <= 59 ? t3 & n3 | t3 & i3 | n3 & i3 : e3 <= 79 ? t3 ^ n3 ^ i3 : void 0;
        }
        _S(e3, t3) {
          return t3 << e3 | t3 >>> 32 - e3;
        }
        _block(e3) {
          const t3 = this, n3 = t3._h, i3 = Array(80);
          for (let t4 = 0; t4 < 16; t4++) i3[t4] = e3[t4];
          let r3 = n3[0], a3 = n3[1], s3 = n3[2], o3 = n3[3], l3 = n3[4];
          for (let e4 = 0; e4 <= 79; e4++) {
            e4 >= 16 && (i3[e4] = t3._S(1, i3[e4 - 3] ^ i3[e4 - 8] ^ i3[e4 - 14] ^ i3[e4 - 16]));
            const n4 = t3._S(5, r3) + t3._f(e4, a3, s3, o3) + l3 + i3[e4] + t3._key[Math.floor(e4 / 20)] | 0;
            l3 = o3, o3 = s3, s3 = t3._S(30, a3), a3 = r3, r3 = n4;
          }
          n3[0] = n3[0] + r3 | 0, n3[1] = n3[1] + a3 | 0, n3[2] = n3[2] + s3 | 0, n3[3] = n3[3] + o3 | 0, n3[4] = n3[4] + l3 | 0;
        }
      } };
      R = { aes: class {
        constructor(e3) {
          const t3 = this;
          t3._tables = [[[], [], [], [], []], [[], [], [], [], []]], t3._tables[0][0][0] || t3._precompute();
          const n3 = t3._tables[0][4], i3 = t3._tables[1], r3 = e3.length;
          let a3, s3, o3, l3 = 1;
          if (4 !== r3 && 6 !== r3 && 8 !== r3) throw new Error("invalid aes key size");
          for (t3._key = [s3 = e3.slice(0), o3 = []], a3 = r3; a3 < 4 * r3 + 28; a3++) {
            let e4 = s3[a3 - 1];
            (a3 % r3 == 0 || 8 === r3 && a3 % r3 == 4) && (e4 = n3[e4 >>> 24] << 24 ^ n3[e4 >> 16 & 255] << 16 ^ n3[e4 >> 8 & 255] << 8 ^ n3[255 & e4], a3 % r3 == 0 && (e4 = e4 << 8 ^ e4 >>> 24 ^ l3 << 24, l3 = l3 << 1 ^ 283 * (l3 >> 7))), s3[a3] = s3[a3 - r3] ^ e4;
          }
          for (let e4 = 0; a3; e4++, a3--) {
            const t4 = s3[3 & e4 ? a3 : a3 - 4];
            o3[e4] = a3 <= 4 || e4 < 4 ? t4 : i3[0][n3[t4 >>> 24]] ^ i3[1][n3[t4 >> 16 & 255]] ^ i3[2][n3[t4 >> 8 & 255]] ^ i3[3][n3[255 & t4]];
          }
        }
        encrypt(e3) {
          return this._crypt(e3, 0);
        }
        decrypt(e3) {
          return this._crypt(e3, 1);
        }
        _precompute() {
          const e3 = this._tables[0], t3 = this._tables[1], n3 = e3[4], i3 = t3[4], r3 = [], a3 = [];
          let s3, o3, l3, c2;
          for (let e4 = 0; e4 < 256; e4++) a3[(r3[e4] = e4 << 1 ^ 283 * (e4 >> 7)) ^ e4] = e4;
          for (let u2 = s3 = 0; !n3[u2]; u2 ^= o3 || 1, s3 = a3[s3] || 1) {
            let a4 = s3 ^ s3 << 1 ^ s3 << 2 ^ s3 << 3 ^ s3 << 4;
            a4 = a4 >> 8 ^ 255 & a4 ^ 99, n3[u2] = a4, i3[a4] = u2, c2 = r3[l3 = r3[o3 = r3[u2]]];
            let d2 = 16843009 * c2 ^ 65537 * l3 ^ 257 * o3 ^ 16843008 * u2, f3 = 257 * r3[a4] ^ 16843008 * a4;
            for (let n4 = 0; n4 < 4; n4++) e3[n4][u2] = f3 = f3 << 24 ^ f3 >>> 8, t3[n4][a4] = d2 = d2 << 24 ^ d2 >>> 8;
          }
          for (let n4 = 0; n4 < 5; n4++) e3[n4] = e3[n4].slice(0), t3[n4] = t3[n4].slice(0);
        }
        _crypt(e3, t3) {
          if (4 !== e3.length) throw new Error("invalid aes block size");
          const n3 = this._key[t3], i3 = n3.length / 4 - 2, r3 = [0, 0, 0, 0], a3 = this._tables[t3], s3 = a3[0], o3 = a3[1], l3 = a3[2], c2 = a3[3], u2 = a3[4];
          let d2, f3, h3, _2 = e3[0] ^ n3[0], w2 = e3[t3 ? 3 : 1] ^ n3[1], b3 = e3[2] ^ n3[2], p3 = e3[t3 ? 1 : 3] ^ n3[3], m3 = 4;
          for (let e4 = 0; e4 < i3; e4++) d2 = s3[_2 >>> 24] ^ o3[w2 >> 16 & 255] ^ l3[b3 >> 8 & 255] ^ c2[255 & p3] ^ n3[m3], f3 = s3[w2 >>> 24] ^ o3[b3 >> 16 & 255] ^ l3[p3 >> 8 & 255] ^ c2[255 & _2] ^ n3[m3 + 1], h3 = s3[b3 >>> 24] ^ o3[p3 >> 16 & 255] ^ l3[_2 >> 8 & 255] ^ c2[255 & w2] ^ n3[m3 + 2], p3 = s3[p3 >>> 24] ^ o3[_2 >> 16 & 255] ^ l3[w2 >> 8 & 255] ^ c2[255 & b3] ^ n3[m3 + 3], m3 += 4, _2 = d2, w2 = f3, b3 = h3;
          for (let e4 = 0; e4 < 4; e4++) r3[t3 ? 3 & -e4 : e4] = u2[_2 >>> 24] << 24 ^ u2[w2 >> 16 & 255] << 16 ^ u2[b3 >> 8 & 255] << 8 ^ u2[255 & p3] ^ n3[m3++], d2 = _2, _2 = w2, w2 = b3, b3 = p3, p3 = d2;
          return r3;
        }
      } };
      B = { getRandomValues(e3) {
        const t3 = new Uint32Array(e3.buffer), n3 = (e4) => {
          let t4 = 987654321;
          const n4 = 4294967295;
          return function() {
            t4 = 36969 * (65535 & t4) + (t4 >> 16) & n4;
            return (((t4 << 16) + (e4 = 18e3 * (65535 & e4) + (e4 >> 16) & n4) & n4) / 4294967296 + 0.5) * (Math.random() > 0.5 ? 1 : -1);
          };
        };
        for (let i3, r3 = 0; r3 < e3.length; r3 += 4) {
          const e4 = n3(4294967296 * (i3 || Math.random()));
          i3 = 987654071 * e4(), t3[r3 / 4] = 4294967296 * e4() | 0;
        }
        return e3;
      } };
      I = { ctrGladman: class {
        constructor(e3, t3) {
          this._prf = e3, this._initIv = t3, this._iv = t3;
        }
        reset() {
          this._iv = this._initIv;
        }
        update(e3) {
          return this.calculate(this._prf, e3, this._iv);
        }
        incWord(e3) {
          if (255 & ~(e3 >> 24)) e3 += 1 << 24;
          else {
            let t3 = e3 >> 16 & 255, n3 = e3 >> 8 & 255, i3 = 255 & e3;
            255 === t3 ? (t3 = 0, 255 === n3 ? (n3 = 0, 255 === i3 ? i3 = 0 : ++i3) : ++n3) : ++t3, e3 = 0, e3 += t3 << 16, e3 += n3 << 8, e3 += i3;
          }
          return e3;
        }
        incCounter(e3) {
          0 === (e3[0] = this.incWord(e3[0])) && (e3[1] = this.incWord(e3[1]));
        }
        calculate(e3, t3, n3) {
          let i3;
          if (!(i3 = t3.length)) return [];
          const r3 = M.bitLength(t3);
          for (let r4 = 0; r4 < i3; r4 += 4) {
            this.incCounter(n3);
            const i4 = e3.encrypt(n3);
            t3[r4] ^= i4[0], t3[r4 + 1] ^= i4[1], t3[r4 + 2] ^= i4[2], t3[r4 + 3] ^= i4[3];
          }
          return M.clamp(t3, r3);
        }
      } };
      N = { importKey: (e3) => new N.hmacSha1(L.bytes.toBits(e3)), pbkdf2(e3, t3, n3, i3) {
        if (n3 = n3 || 1e4, i3 < 0 || n3 < 0) throw new Error("invalid params to pbkdf2");
        const r3 = 1 + (i3 >> 5) << 2;
        let a3, s3, o3, l3, c2;
        const u2 = new ArrayBuffer(r3), d2 = new DataView(u2);
        let f3 = 0;
        const h3 = M;
        for (t3 = L.bytes.toBits(t3), c2 = 1; f3 < (r3 || 1); c2++) {
          for (a3 = s3 = e3.encrypt(h3.concat(t3, [c2])), o3 = 1; o3 < n3; o3++) for (s3 = e3.encrypt(s3), l3 = 0; l3 < s3.length; l3++) a3[l3] ^= s3[l3];
          for (o3 = 0; f3 < (r3 || 1) && o3 < a3.length; o3++) d2.setInt32(f3, a3[o3]), f3 += 4;
        }
        return u2.slice(0, i3 / 8);
      }, hmacSha1: class {
        constructor(e3) {
          const t3 = this, n3 = t3._hash = P.sha1, i3 = [[], []];
          t3._baseHash = [new n3(), new n3()];
          const r3 = t3._baseHash[0].blockSize / 32;
          e3.length > r3 && (e3 = new n3().update(e3).finalize());
          for (let t4 = 0; t4 < r3; t4++) i3[0][t4] = 909522486 ^ e3[t4], i3[1][t4] = 1549556828 ^ e3[t4];
          t3._baseHash[0].update(i3[0]), t3._baseHash[1].update(i3[1]), t3._resultHash = new n3(t3._baseHash[0]);
        }
        reset() {
          const e3 = this;
          e3._resultHash = new e3._hash(e3._baseHash[0]), e3._updated = false;
        }
        update(e3) {
          this._updated = true, this._resultHash.update(e3);
        }
        digest() {
          const e3 = this, t3 = e3._resultHash.finalize(), n3 = new e3._hash(e3._baseHash[1]).update(t3).finalize();
          return e3.reset(), n3;
        }
        encrypt(e3) {
          if (this._updated) throw new Error("encrypt on already updated hmac called!");
          return this.update(e3), this.digest(e3);
        }
      } };
      V = typeof crypto != z && typeof crypto.getRandomValues == A;
      q = "Invalid password";
      H = "Invalid signature";
      K = "zipjs-abort-check-password";
      G = 16;
      J = { name: "PBKDF2" };
      Q = Object.assign({ hash: { name: "HMAC" } }, J);
      X = Object.assign({ iterations: 1e3, hash: { name: "SHA-1" } }, J);
      Y = ["deriveBits"];
      $ = [8, 12, 16];
      ee = [16, 24, 32];
      te = 10;
      ne = [0, 0, 0, 0];
      ie = typeof crypto != z;
      re = ie && crypto.subtle;
      ae = ie && typeof re != z;
      se = L.bytes;
      oe = R.aes;
      le = I.ctrGladman;
      ce = N.hmacSha1;
      ue = ie && ae && typeof re.importKey == A;
      de = ie && ae && typeof re.deriveBits == A;
      fe = class extends TransformStream {
        constructor({ password: e3, rawPassword: t3, signed: n3, encryptionStrength: i3, checkPasswordOnly: r3 }) {
          super({ start() {
            Object.assign(this, { ready: new Promise((e4) => this.resolveReady = e4), password: be(e3, t3), signed: n3, strength: i3 - 1, pending: new Uint8Array() });
          }, async transform(e4, t4) {
            const n4 = this, { password: i4, strength: a3, resolveReady: s3, ready: o3 } = n4;
            i4 ? (await async function(e5, t5, n5, i5) {
              const r4 = await we(e5, t5, n5, me(i5, 0, $[t5])), a4 = me(i5, $[t5]);
              if (r4[0] != a4[0] || r4[1] != a4[1]) throw new Error(q);
            }(n4, a3, i4, me(e4, 0, $[a3] + 2)), e4 = me(e4, $[a3] + 2), r3 ? t4.error(new Error(K)) : s3()) : await o3;
            const l3 = new Uint8Array(e4.length - te - (e4.length - te) % G);
            t4.enqueue(_e(n4, e4, l3, 0, te, true));
          }, async flush(e4) {
            const { signed: t4, ctr: n4, hmac: i4, pending: r4, ready: a3 } = this;
            if (i4 && n4) {
              await a3;
              const s3 = me(r4, 0, r4.length - te), o3 = me(r4, r4.length - te);
              let l3 = new Uint8Array();
              if (s3.length) {
                const e5 = ye(se, s3);
                i4.update(e5);
                const t5 = n4.update(e5);
                l3 = ge(se, t5);
              }
              if (t4) {
                const e5 = me(ge(se, i4.digest()), 0, te);
                for (let t5 = 0; t5 < te; t5++) if (e5[t5] != o3[t5]) throw new Error(H);
              }
              e4.enqueue(l3);
            }
          } });
        }
      };
      he = class extends TransformStream {
        constructor({ password: e3, rawPassword: t3, encryptionStrength: n3 }) {
          let i3;
          super({ start() {
            Object.assign(this, { ready: new Promise((e4) => this.resolveReady = e4), password: be(e3, t3), strength: n3 - 1, pending: new Uint8Array() });
          }, async transform(e4, t4) {
            const n4 = this, { password: i4, strength: r3, resolveReady: a3, ready: s3 } = n4;
            let o3 = new Uint8Array();
            i4 ? (o3 = await async function(e5, t5, n5) {
              const i5 = Z(new Uint8Array($[t5])), r4 = await we(e5, t5, n5, i5);
              return pe(i5, r4);
            }(n4, r3, i4), a3()) : await s3;
            const l3 = new Uint8Array(o3.length + e4.length - e4.length % G);
            l3.set(o3, 0), t4.enqueue(_e(n4, e4, l3, o3.length, 0));
          }, async flush(e4) {
            const { ctr: t4, hmac: n4, pending: r3, ready: a3 } = this;
            if (n4 && t4) {
              await a3;
              let s3 = new Uint8Array();
              if (r3.length) {
                const e5 = t4.update(ye(se, r3));
                n4.update(e5), s3 = ge(se, e5);
              }
              i3.signature = ge(se, n4.digest()).slice(0, te), e4.enqueue(pe(s3, i3.signature));
            }
          } }), i3 = this;
        }
      };
      xe = 12;
      ke = class extends TransformStream {
        constructor({ password: e3, passwordVerification: t3, checkPasswordOnly: n3 }) {
          super({ start() {
            Object.assign(this, { password: e3, passwordVerification: t3 }), Ae(this, e3);
          }, transform(e4, t4) {
            const i3 = this;
            if (i3.password) {
              const t5 = Se(i3, e4.subarray(0, xe));
              if (i3.password = null, t5[11] != i3.passwordVerification) throw new Error(q);
              e4 = e4.subarray(xe);
            }
            n3 ? t4.error(new Error(K)) : t4.enqueue(Se(i3, e4));
          } });
        }
      };
      ve = class extends TransformStream {
        constructor({ password: e3, passwordVerification: t3 }) {
          super({ start() {
            Object.assign(this, { password: e3, passwordVerification: t3 }), Ae(this, e3);
          }, transform(e4, t4) {
            const n3 = this;
            let i3, r3;
            if (n3.password) {
              n3.password = null;
              const t5 = Z(new Uint8Array(xe));
              t5[11] = n3.passwordVerification, i3 = new Uint8Array(e4.length + t5.length), i3.set(ze(n3, t5), 0), r3 = xe;
            } else i3 = new Uint8Array(e4.length), r3 = 0;
            i3.set(ze(n3, e4), r3), t4.enqueue(i3);
          } });
        }
      };
      Te = "deflate-raw";
      Oe = class extends TransformStream {
        constructor(e3, { chunkSize: t3, CompressionStream: n3, CompressionStreamNative: i3 }) {
          super({});
          const { compressed: r3, encrypted: a3, useCompressionStream: s3, zipCrypto: o3, signed: l3, level: c2 } = e3, u2 = this;
          let d2, f3, h3 = We(super.readable);
          a3 && !o3 || !l3 || (d2 = new j(), h3 = Le(h3, d2)), r3 && (h3 = Me(h3, s3, { level: c2, chunkSize: t3 }, i3, n3)), a3 && (o3 ? h3 = Le(h3, new ve(e3)) : (f3 = new he(e3), h3 = Le(h3, f3))), je(u2, h3, () => {
            let e4;
            a3 && !o3 && (e4 = f3.signature), a3 && !o3 || !l3 || (e4 = new DataView(d2.value.buffer).getUint32(0)), u2.signature = e4;
          });
        }
      };
      Ce = class extends TransformStream {
        constructor(e3, { chunkSize: t3, DecompressionStream: n3, DecompressionStreamNative: i3 }) {
          super({});
          const { zipCrypto: r3, encrypted: a3, signed: s3, signature: o3, compressed: l3, useCompressionStream: c2 } = e3;
          let u2, d2, f3 = We(super.readable);
          a3 && (r3 ? f3 = Le(f3, new ke(e3)) : (d2 = new fe(e3), f3 = Le(f3, d2))), l3 && (f3 = Me(f3, c2, { chunkSize: t3 }, i3, n3)), a3 && !r3 || !s3 || (u2 = new j(), f3 = Le(f3, u2)), je(this, f3, () => {
            if ((!a3 || r3) && s3) {
              const e4 = new DataView(u2.value.buffer);
              if (o3 != e4.getUint32(0, false)) throw new Error(H);
            }
          });
        }
      };
      Pe = "message";
      Re = "start";
      Be = "pull";
      Ie = "data";
      Ne = "close";
      Ve = "inflate";
      qe = class extends TransformStream {
        constructor(e3, t3) {
          super({});
          const n3 = this, { codecType: i3 } = e3;
          let r3;
          i3.startsWith("deflate") ? r3 = Oe : i3.startsWith(Ve) && (r3 = Ce);
          let a3 = 0, s3 = 0;
          const o3 = new r3(e3, t3), l3 = super.readable, c2 = new TransformStream({ transform(e4, t4) {
            e4 && e4.length && (s3 += e4.length, t4.enqueue(e4));
          }, flush() {
            Object.assign(n3, { inputSize: s3 });
          } }), u2 = new TransformStream({ transform(e4, t4) {
            e4 && e4.length && (a3 += e4.length, t4.enqueue(e4));
          }, flush() {
            const { signature: e4 } = o3;
            Object.assign(n3, { signature: e4, outputSize: a3, inputSize: s3 });
          } });
          Object.defineProperty(n3, "readable", { get: () => l3.pipeThrough(c2).pipeThrough(o3).pipeThrough(u2) });
        }
      };
      He = class extends TransformStream {
        constructor(e3) {
          let t3;
          super({ transform: function n3(i3, r3) {
            if (t3) {
              const e4 = new Uint8Array(t3.length + i3.length);
              e4.set(t3), e4.set(i3, t3.length), i3 = e4, t3 = null;
            }
            i3.length > e3 ? (r3.enqueue(i3.slice(0, e3)), n3(i3.slice(e3), r3)) : t3 = i3;
          }, flush(e4) {
            t3 && t3.length && e4.enqueue(t3);
          } });
        }
      };
      Ke = typeof Worker != z;
      Ze = class {
        constructor(e3, { readable: t3, writable: n3 }, { options: i3, config: r3, streamOptions: a3, useWebWorkers: s3, transferStreams: o3, scripts: l3 }, c2) {
          const { signal: u2 } = a3;
          return Object.assign(e3, { busy: true, readable: t3.pipeThrough(new He(r3.chunkSize)).pipeThrough(new Ge(t3, a3), { signal: u2 }), writable: n3, options: Object.assign({}, i3), scripts: l3, transferStreams: o3, terminate: () => new Promise((t4) => {
            const { worker: n4, busy: i4 } = e3;
            n4 ? (i4 ? e3.resolveTerminated = t4 : (n4.terminate(), t4()), e3.interface = null) : t4();
          }), onTaskFinished() {
            const { resolveTerminated: t4 } = e3;
            t4 && (e3.resolveTerminated = null, e3.terminated = true, e3.worker.terminate(), t4()), e3.busy = false, c2(e3);
          } }), (s3 && Ke ? Xe : Qe)(e3, r3);
        }
      };
      Ge = class extends TransformStream {
        constructor(e3, { onstart: t3, onprogress: n3, size: i3, onend: r3 }) {
          let a3 = 0;
          super({ async start() {
            t3 && await Je(t3, i3);
          }, async transform(e4, t4) {
            a3 += e4.length, n3 && await Je(n3, a3, i3), t4.enqueue(e4);
          }, async flush() {
            e3.size = a3, r3 && await Je(r3, a3);
          } });
        }
      };
      Ye = true;
      $e = true;
      tt = [];
      nt = [];
      it = 0;
      st = 65536;
      ot = "writable";
      lt = class {
        constructor() {
          this.size = 0;
        }
        init() {
          this.initialized = true;
        }
      };
      ct = class extends lt {
        get readable() {
          const e3 = this, { chunkSize: t3 = st } = e3, n3 = new ReadableStream({ start() {
            this.chunkOffset = 0;
          }, async pull(i3) {
            const { offset: r3 = 0, size: a3, diskNumberStart: s3 } = n3, { chunkOffset: o3 } = this, l3 = a3 === S ? t3 : Math.min(t3, a3 - o3), c2 = await pt(e3, r3 + o3, l3, s3);
            i3.enqueue(c2), o3 + t3 > a3 || a3 === S && !c2.length && l3 ? i3.close() : this.chunkOffset += t3;
          } });
          return n3;
        }
      };
      ut = class extends ct {
        constructor(e3) {
          super(), Object.assign(this, { blob: e3, size: e3.size });
        }
        async readUint8Array(e3, t3) {
          const n3 = this, i3 = e3 + t3, r3 = e3 || i3 < n3.size ? n3.blob.slice(e3, i3) : n3.blob;
          let a3 = await r3.arrayBuffer();
          return a3.byteLength > t3 && (a3 = a3.slice(e3, i3)), new Uint8Array(a3);
        }
      };
      dt = class extends lt {
        constructor(e3) {
          super();
          const t3 = new TransformStream(), n3 = [];
          e3 && n3.push(["Content-Type", e3]), Object.defineProperty(this, ot, { get: () => t3.writable }), this.blob = new Response(t3.readable, { headers: n3 }).blob();
        }
        getData() {
          return this.blob;
        }
      };
      ft = class extends dt {
        constructor(e3) {
          super(e3), Object.assign(this, { encoding: e3, utf8: !e3 || "utf-8" == e3.toLowerCase() });
        }
        async getData() {
          const { encoding: e3, utf8: t3 } = this, n3 = await super.getData();
          if (n3.text && t3) return n3.text();
          {
            const t4 = new FileReader();
            return new Promise((i3, r3) => {
              Object.assign(t4, { onload: ({ target: e4 }) => i3(e4.result), onerror: () => r3(t4.error) }), t4.readAsText(n3, e3);
            });
          }
        }
      };
      ht = class extends ct {
        constructor(e3) {
          super(), this.readers = e3;
        }
        async init() {
          const e3 = this, { readers: t3 } = e3;
          e3.lastDiskNumber = 0, e3.lastDiskOffset = 0, await Promise.all(t3.map(async (n3, i3) => {
            await n3.init(), i3 != t3.length - 1 && (e3.lastDiskOffset += n3.size), e3.size += n3.size;
          })), super.init();
        }
        async readUint8Array(e3, t3, n3 = 0) {
          const i3 = this, { readers: r3 } = this;
          let a3, s3 = n3;
          -1 == s3 && (s3 = r3.length - 1);
          let o3 = e3;
          for (; o3 >= r3[s3].size; ) o3 -= r3[s3].size, s3++;
          const l3 = r3[s3], c2 = l3.size;
          if (o3 + t3 <= c2) a3 = await pt(l3, o3, t3);
          else {
            const r4 = c2 - o3;
            a3 = new Uint8Array(t3), a3.set(await pt(l3, o3, r4)), a3.set(await i3.readUint8Array(e3 + r4, t3 - r4, n3), r4);
          }
          return i3.lastDiskNumber = Math.max(s3, i3.lastDiskNumber), a3;
        }
      };
      _t = class extends lt {
        constructor(e3, t3 = 4294967295) {
          super();
          const n3 = this;
          let i3, r3, a3;
          Object.assign(n3, { diskNumber: 0, diskOffset: 0, size: 0, maxSize: t3, availableSize: t3 });
          const s3 = new WritableStream({ async write(t4) {
            const { availableSize: s4 } = n3;
            if (a3) t4.length >= s4 ? (await o3(t4.slice(0, s4)), await l3(), n3.diskOffset += i3.size, n3.diskNumber++, a3 = null, await this.write(t4.slice(s4))) : await o3(t4);
            else {
              const { value: s5, done: o4 } = await e3.next();
              if (o4 && !s5) throw new Error("Writer iterator completed too soon");
              i3 = s5, i3.size = 0, i3.maxSize && (n3.maxSize = i3.maxSize), n3.availableSize = n3.maxSize, await wt(i3), r3 = s5.writable, a3 = r3.getWriter(), await this.write(t4);
            }
          }, async close() {
            await a3.ready, await l3();
          } });
          async function o3(e4) {
            const t4 = e4.length;
            t4 && (await a3.ready, await a3.write(e4), i3.size += t4, n3.size += t4, n3.availableSize -= t4);
          }
          async function l3() {
            r3.size = i3.size, await a3.close();
          }
          Object.defineProperty(n3, ot, { get: () => s3 });
        }
      };
      mt = "\\0\\u263A\\u263B\\u2665\\u2666\\u2663\\u2660\\u2022\\u25D8\\u25CB\\u25D9\\u2642\\u2640\\u266A\\u266B\\u263C\\u25BA\\u25C4\\u2195\\u203C\\xB6\\xA7\\u25AC\\u21A8\\u2191\\u2193\\u2192\\u2190\\u221F\\u2194\\u25B2\\u25BC !\\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~\\u2302\\xC7\\xFC\\xE9\\xE2\\xE4\\xE0\\xE5\\xE7\\xEA\\xEB\\xE8\\xEF\\xEE\\xEC\\xC4\\xC5\\xC9\\xE6\\xC6\\xF4\\xF6\\xF2\\xFB\\xF9\\xFF\\xD6\\xDC\\xA2\\xA3\\xA5\\u20A7\\u0192\\xE1\\xED\\xF3\\xFA\\xF1\\xD1\\xAA\\xBA\\xBF\\u2310\\xAC\\xBD\\xBC\\xA1\\xAB\\xBB\\u2591\\u2592\\u2593\\u2502\\u2524\\u2561\\u2562\\u2556\\u2555\\u2563\\u2551\\u2557\\u255D\\u255C\\u255B\\u2510\\u2514\\u2534\\u252C\\u251C\\u2500\\u253C\\u255E\\u255F\\u255A\\u2554\\u2569\\u2566\\u2560\\u2550\\u256C\\u2567\\u2568\\u2564\\u2565\\u2559\\u2558\\u2552\\u2553\\u256B\\u256A\\u2518\\u250C\\u2588\\u2584\\u258C\\u2590\\u2580\\u03B1\\xDF\\u0393\\u03C0\\u03A3\\u03C3\\xB5\\u03C4\\u03A6\\u0398\\u03A9\\u03B4\\u221E\\u03C6\\u03B5\\u2229\\u2261\\xB1\\u2265\\u2264\\u2320\\u2321\\xF7\\u2248\\xB0\\u2219\\xB7\\u221A\\u207F\\xB2\\u25A0 ".split("");
      gt = 256 == mt.length;
      xt = "filename";
      kt = "rawFilename";
      vt = "comment";
      St = "rawComment";
      zt = "uncompressedSize";
      At = "compressedSize";
      Ut = "offset";
      Dt = "diskNumberStart";
      Et = "lastModDate";
      Ft = "rawLastModDate";
      Tt = "lastAccessDate";
      Ot = "rawLastAccessDate";
      Ct = "creationDate";
      Wt = "rawCreationDate";
      jt = [xt, kt, At, zt, Et, Ft, vt, St, Tt, Ct, Ut, Dt, Dt, "internalFileAttribute", "internalFileAttributes", "externalFileAttribute", "externalFileAttributes", "msDosCompatible", "zip64", "encrypted", "version", "versionMadeBy", "zipCrypto", "directory", "executable", "bitFlag", "signature", "filenameUTF8", "commentUTF8", "compressionMethod", "extraField", "rawExtraField", "extraFieldZip64", "extraFieldUnicodePath", "extraFieldUnicodeComment", "extraFieldAES", "extraFieldNTFS", "extraFieldExtendedTimestamp"];
      Mt = class {
        constructor(e3) {
          jt.forEach((t3) => this[t3] = e3[t3]);
        }
      };
      Lt = "File format is not recognized";
      Pt = "Zip64 extra field not found";
      Rt = "Compression method not supported";
      Bt = "Split zip file";
      It = "utf-8";
      Nt = "cp437";
      Vt = [[zt, g], [At, g], [Ut, g], [Dt, y]];
      qt = { [y]: { getValue: tn, bytes: 4 }, [g]: { getValue: nn, bytes: 8 } };
      Ht = class {
        constructor(e3, t3 = {}) {
          Object.assign(this, { reader: bt(e3), options: t3, config: F });
        }
        async *getEntriesGenerator(e3 = {}) {
          const t3 = this;
          let { reader: n3 } = t3;
          const { config: i3 } = t3;
          if (await wt(n3), n3.size !== S && n3.readUint8Array || (n3 = new ut(await new Response(n3.readable).blob()), await wt(n3)), n3.size < v) throw new Error(Lt);
          n3.chunkSize = function(e4) {
            return Math.max(e4.chunkSize, 64);
          }(i3);
          const r3 = await async function(e4, t4, n4, i4, r4) {
            const a4 = new Uint8Array(4);
            !function(e5, t5, n5) {
              e5.setUint32(t5, n5, true);
            }(rn(a4), 0, t4);
            const s4 = i4 + r4;
            return await o4(i4) || await o4(Math.min(s4, n4));
            async function o4(t5) {
              const r5 = n4 - t5, s5 = await pt(e4, r5, t5);
              for (let e5 = s5.length - i4; e5 >= 0; e5--) if (s5[e5] == a4[0] && s5[e5 + 1] == a4[1] && s5[e5 + 2] == a4[2] && s5[e5 + 3] == a4[3]) return { offset: r5 + e5, buffer: s5.slice(e5, e5 + i4).buffer };
            }
          }(n3, 101010256, n3.size, v, 1048560);
          if (!r3) {
            throw 134695760 == tn(rn(await pt(n3, 0, 4))) ? new Error(Bt) : new Error("End of central directory not found");
          }
          const a3 = rn(r3);
          let s3 = tn(a3, 12), o3 = tn(a3, 16);
          const l3 = r3.offset, c2 = en(a3, 20), u2 = l3 + v + c2;
          let d2 = en(a3, 4);
          const f3 = n3.lastDiskNumber || 0;
          let h3 = en(a3, 6), _2 = en(a3, 8), w2 = 0, b3 = 0;
          if (o3 == g || s3 == g || _2 == y || h3 == y) {
            const e4 = rn(await pt(n3, r3.offset - 20, 20));
            if (117853008 == tn(e4, 0)) {
              o3 = nn(e4, 8);
              let t4 = await pt(n3, o3, 56, -1), i4 = rn(t4);
              const a4 = r3.offset - 20 - 56;
              if (tn(i4, 0) != k && o3 != a4) {
                const e5 = o3;
                o3 = a4, w2 = o3 - e5, t4 = await pt(n3, o3, 56, -1), i4 = rn(t4);
              }
              if (tn(i4, 0) != k) throw new Error("End of Zip64 central directory locator not found");
              d2 == y && (d2 = tn(i4, 16)), h3 == y && (h3 = tn(i4, 20)), _2 == y && (_2 = nn(i4, 32)), s3 == g && (s3 = nn(i4, 40)), o3 -= s3;
            }
          }
          if (o3 >= n3.size && (w2 = n3.size - o3 - s3 - v, o3 = n3.size - s3 - v), f3 != d2) throw new Error(Bt);
          if (o3 < 0) throw new Error(Lt);
          let p3 = 0, m3 = await pt(n3, o3, s3, h3), z3 = rn(m3);
          if (s3) {
            const e4 = r3.offset - s3;
            if (tn(z3, p3) != x && o3 != e4) {
              const t4 = o3;
              o3 = e4, w2 += o3 - t4, m3 = await pt(n3, o3, s3, h3), z3 = rn(m3);
            }
          }
          const A3 = r3.offset - o3 - (n3.lastDiskOffset || 0);
          if (s3 != A3 && A3 >= 0 && (s3 = A3, m3 = await pt(n3, o3, s3, h3), z3 = rn(m3)), o3 < 0 || o3 >= n3.size) throw new Error(Lt);
          const U3 = Qt(t3, e3, "filenameEncoding"), D2 = Qt(t3, e3, "commentEncoding");
          for (let r4 = 0; r4 < _2; r4++) {
            const a4 = new Kt(n3, i3, t3.options);
            if (tn(z3, p3) != x) throw new Error("Central directory header not found");
            Zt(a4, z3, p3 + 6);
            const s4 = Boolean(a4.bitFlag.languageEncodingFlag), o4 = p3 + 46, l4 = o4 + a4.filenameLength, c3 = l4 + a4.extraFieldLength, u3 = en(z3, p3 + 4), d3 = !(u3 >> 8), f4 = u3 >> 8 == 3, h4 = m3.subarray(o4, l4), g3 = en(z3, p3 + 32), y3 = c3 + g3, k3 = m3.subarray(c3, y3), v3 = s4, A4 = s4, E4 = tn(z3, p3 + 38), F3 = d3 && !(16 & ~$t(z3, p3 + 38)) || f4 && !(16384 & ~(E4 >> 16)) || h4.length && h4[h4.length - 1] == "/".charCodeAt(0), T3 = f4 && !(73 & ~(E4 >> 16)), O2 = tn(z3, p3 + 42) + w2;
            Object.assign(a4, { versionMadeBy: u3, msDosCompatible: d3, compressedSize: 0, uncompressedSize: 0, commentLength: g3, directory: F3, offset: O2, diskNumberStart: en(z3, p3 + 34), internalFileAttributes: en(z3, p3 + 36), externalFileAttributes: E4, rawFilename: h4, filenameUTF8: v3, commentUTF8: A4, rawExtraField: m3.subarray(l4, c3), executable: T3 }), a4.internalFileAttribute = a4.internalFileAttributes, a4.externalFileAttribute = a4.externalFileAttributes;
            const C2 = Qt(t3, e3, "decodeText") || yt, W2 = v3 ? It : U3 || Nt, j2 = A4 ? It : D2 || Nt;
            let M2 = C2(h4, W2);
            M2 === S && (M2 = yt(h4, W2));
            let L2 = C2(k3, j2);
            L2 === S && (L2 = yt(k3, j2)), Object.assign(a4, { rawComment: k3, filename: M2, comment: L2, directory: F3 || M2.endsWith("/") }), b3 = Math.max(O2, b3), Gt(a4, a4, z3, p3 + 6), a4.zipCrypto = a4.encrypted && !a4.extraFieldAES;
            const P2 = new Mt(a4);
            P2.getData = (e4, t4) => a4.getData(e4, P2, t4), p3 = y3;
            const { onprogress: R2 } = e3;
            if (R2) try {
              await R2(r4 + 1, _2, new Mt(a4));
            } catch (e4) {
            }
            yield P2;
          }
          const E3 = Qt(t3, e3, "extractPrependedData"), F2 = Qt(t3, e3, "extractAppendedData");
          return E3 && (t3.prependedData = b3 > 0 ? await pt(n3, 0, b3) : new Uint8Array()), t3.comment = c2 ? await pt(n3, l3 + v, c2) : new Uint8Array(), F2 && (t3.appendedData = u2 < n3.size ? await pt(n3, u2, n3.size - u2) : new Uint8Array()), true;
        }
        async getEntries(e3 = {}) {
          const t3 = [];
          for await (const n3 of this.getEntriesGenerator(e3)) t3.push(n3);
          return t3;
        }
        async close() {
        }
      };
      Kt = class {
        constructor(e3, t3, n3) {
          Object.assign(this, { reader: e3, config: t3, options: n3 });
        }
        async getData(e3, t3, n3 = {}) {
          const i3 = this, { reader: r3, offset: a3, diskNumberStart: s3, extraFieldAES: o3, compressionMethod: l3, config: c2, bitFlag: u2, signature: d2, rawLastModDate: f3, uncompressedSize: h3, compressedSize: _2 } = i3, w2 = t3.localDirectory = {}, b3 = rn(await pt(r3, a3, 30, s3));
          let p3 = Qt(i3, n3, "password"), m3 = Qt(i3, n3, "rawPassword");
          const g3 = Qt(i3, n3, "passThrough");
          if (p3 = p3 && p3.length && p3, m3 = m3 && m3.length && m3, o3 && 99 != o3.originalCompressionMethod) throw new Error(Rt);
          if (0 != l3 && 8 != l3 && !g3) throw new Error(Rt);
          if (67324752 != tn(b3, 0)) throw new Error("Local file header not found");
          Zt(w2, b3, 4), w2.rawExtraField = w2.extraFieldLength ? await pt(r3, a3 + 30 + w2.filenameLength, w2.extraFieldLength, s3) : new Uint8Array(), Gt(i3, w2, b3, 4, true), Object.assign(t3, { lastAccessDate: w2.lastAccessDate, creationDate: w2.creationDate });
          const y3 = i3.encrypted && w2.encrypted && !g3, x3 = y3 && !o3;
          if (g3 || (t3.zipCrypto = x3), y3) {
            if (!x3 && o3.strength === S) throw new Error("Encryption method not supported");
            if (!p3 && !m3) throw new Error("File contains encrypted entry");
          }
          const k3 = a3 + 30 + w2.filenameLength + w2.extraFieldLength, v3 = _2, z3 = r3.readable;
          Object.assign(z3, { diskNumberStart: s3, offset: k3, size: v3 });
          const U3 = Qt(i3, n3, "signal"), D2 = Qt(i3, n3, "checkPasswordOnly");
          D2 && (e3 = new WritableStream()), e3 = function(e4) {
            e4.writable === S && typeof e4.next == A && (e4 = new _t(e4)), e4 instanceof WritableStream && (e4 = { writable: e4 });
            const { writable: t4 } = e4;
            return t4.size === S && (t4.size = 0), e4 instanceof _t || Object.assign(e4, { diskNumber: 0, diskOffset: 0, availableSize: 1 / 0, maxSize: 1 / 0 }), e4;
          }(e3), await wt(e3, g3 ? _2 : h3);
          const { writable: E3 } = e3, { onstart: F2, onprogress: T3, onend: O2 } = n3, C2 = { options: { codecType: Ve, password: p3, rawPassword: m3, zipCrypto: x3, encryptionStrength: o3 && o3.strength, signed: Qt(i3, n3, "checkSignature") && !g3, passwordVerification: x3 && (u2.dataDescriptor ? f3 >>> 8 & 255 : d2 >>> 24 & 255), signature: d2, compressed: 0 != l3 && !g3, encrypted: i3.encrypted && !g3, useWebWorkers: Qt(i3, n3, "useWebWorkers"), useCompressionStream: Qt(i3, n3, "useCompressionStream"), transferStreams: Qt(i3, n3, "transferStreams"), checkPasswordOnly: D2 }, config: c2, streamOptions: { signal: U3, size: v3, onstart: F2, onprogress: T3, onend: O2 } };
          let W2 = 0;
          try {
            ({ outputSize: W2 } = await rt({ readable: z3, writable: E3 }, C2));
          } catch (e4) {
            if (!D2 || e4.message != K) throw e4;
          } finally {
            const e4 = Qt(i3, n3, "preventClose");
            E3.size += W2, e4 || E3.locked || await E3.getWriter().close();
          }
          return D2 ? S : e3.getData ? e3.getData() : E3;
        }
      };
      T({ Inflate: function(e3) {
        const t3 = new m(), i3 = e3 && e3.chunkSize ? Math.floor(2 * e3.chunkSize) : 131072, r3 = new Uint8Array(i3);
        let a3 = false;
        t3.inflateInit(), t3.next_out = r3, this.append = function(e4, s3) {
          const o3 = [];
          let l3, c2, u2 = 0, d2 = 0, f3 = 0;
          if (0 !== e4.length) {
            t3.next_in_index = 0, t3.next_in = e4, t3.avail_in = e4.length;
            do {
              if (t3.next_out_index = 0, t3.avail_out = i3, 0 !== t3.avail_in || a3 || (t3.next_in_index = 0, a3 = true), l3 = t3.inflate(0), a3 && l3 === n) {
                if (0 !== t3.avail_in) throw new Error("inflating: bad input");
              } else if (0 !== l3 && 1 !== l3) throw new Error("inflating: " + t3.msg);
              if ((a3 || 1 === l3) && t3.avail_in === e4.length) throw new Error("inflating: bad input");
              t3.next_out_index && (t3.next_out_index === i3 ? o3.push(new Uint8Array(r3)) : o3.push(r3.subarray(0, t3.next_out_index))), f3 += t3.next_out_index, s3 && t3.next_in_index > 0 && t3.next_in_index != u2 && (s3(t3.next_in_index), u2 = t3.next_in_index);
            } while (t3.avail_in > 0 || 0 === t3.avail_out);
            return o3.length > 1 ? (c2 = new Uint8Array(f3), o3.forEach(function(e5) {
              c2.set(e5, d2), d2 += e5.length;
            })) : c2 = o3[0] ? new Uint8Array(o3[0]) : new Uint8Array(), c2;
          }
        }, this.flush = function() {
          t3.inflateEnd();
        };
      } });
    }
  });

  // src/libs/foliate-js/epub.ts
  var epub_exports = {};
  __export(epub_exports, {
    EPUB: () => EPUB
  });
  var NS, MIME, PREFIX, RELATORS, ONIX5, camel, normalizeWhitespace, filterAttribute, getAttributes, getElementText, childGetter, resolveURL, isExternal, pathRelative, pathDirname, replaceSeries, regexEscape, tidy, getPrefixes, getPropertyURL, getMetadata, parseNav, parseNCX, parseClock, _entries, _lastMediaOverlayItem, _sectionIndex, _audioIndex, _itemIndex, _audio, _volume, _rate, _state, _MediaOverlay_instances, loadSMIL_fn, activeAudio_get, activeItem_get, error_fn, highlight_fn, unhighlight_fn, play_fn, stop_fn, MediaOverlay, isUUID, getUUID, getIdentifier, deobfuscate, WebCryptoSHA1, deobfuscators, _uris, _decoders, _algorithms, Encryption, Resources, _cache, _children, _refCount, Loader, getHTMLFragment, getPageSpread, getDisplayOptions, _loader, _encryption, _EPUB_instances, loadXML_fn, EPUB;
  var init_epub = __esm({
    "src/libs/foliate-js/epub.ts"() {
      "use strict";
      init_epubcfi();
      NS = {
        CONTAINER: "urn:oasis:names:tc:opendocument:xmlns:container",
        XHTML: "http://www.w3.org/1999/xhtml",
        OPF: "http://www.idpf.org/2007/opf",
        EPUB: "http://www.idpf.org/2007/ops",
        DC: "http://purl.org/dc/elements/1.1/",
        DCTERMS: "http://purl.org/dc/terms/",
        ENC: "http://www.w3.org/2001/04/xmlenc#",
        NCX: "http://www.daisy.org/z3986/2005/ncx/",
        XLINK: "http://www.w3.org/1999/xlink",
        SMIL: "http://www.w3.org/ns/SMIL"
      };
      MIME = {
        XML: "application/xml",
        NCX: "application/x-dtbncx+xml",
        XHTML: "application/xhtml+xml",
        HTML: "text/html",
        CSS: "text/css",
        SVG: "image/svg+xml",
        JS: /\\/(x-)?(javascript|ecmascript)/
      };
      PREFIX = {
        a11y: "http://www.idpf.org/epub/vocab/package/a11y/#",
        dcterms: "http://purl.org/dc/terms/",
        marc: "http://id.loc.gov/vocabulary/",
        media: "http://www.idpf.org/epub/vocab/overlays/#",
        onix: "http://www.editeur.org/ONIX/book/codelists/current.html#",
        rendition: "http://www.idpf.org/vocab/rendition/#",
        schema: "http://schema.org/",
        xsd: "http://www.w3.org/2001/XMLSchema#",
        msv: "http://www.idpf.org/epub/vocab/structure/magazine/#",
        prism: "http://www.prismstandard.org/specifications/3.0/PRISM_CV_Spec_3.0.htm#"
      };
      RELATORS = {
        art: "artist",
        aut: "author",
        clr: "colorist",
        edt: "editor",
        ill: "illustrator",
        nrt: "narrator",
        trl: "translator",
        pbl: "publisher"
      };
      ONIX5 = {
        "02": "isbn",
        "06": "doi",
        "15": "isbn",
        "26": "doi",
        "34": "issn"
      };
      camel = (x3) => x3.toLowerCase().replace(/[-:](.)/g, (_2, g3) => g3.toUpperCase());
      normalizeWhitespace = (str) => str ? str.replace(/[\\t\\n\\f\\r ]+/g, " ").replace(/^[\\t\\n\\f\\r ]+/, "").replace(/[\\t\\n\\f\\r ]+$/, "") : "";
      filterAttribute = (attr, value, isList) => isList ? (el) => el.getAttribute(attr)?.split(/\\s/)?.includes(value) ?? false : typeof value === "function" ? (el) => value(el.getAttribute(attr)) : (el) => el.getAttribute(attr) === value;
      getAttributes = (...xs) => (el) => el ? Object.fromEntries(xs.map((x3) => [camel(x3), el.getAttribute(x3)])) : null;
      getElementText = (el) => normalizeWhitespace(el?.textContent);
      childGetter = (doc, ns) => {
        const useNS = doc.lookupNamespaceURI(null) === ns || doc.lookupPrefix(ns);
        const f3 = useNS ? (_el2, name) => (el) => el.namespaceURI === ns && el.localName === name : (_el2, name) => (el) => el.localName === name;
        return {
          $: (el, name) => [...el.children].find(f3(el, name)),
          $$: (el, name) => [...el.children].filter(f3(el, name)),
          $$$: useNS ? (el, name) => [...el.getElementsByTagNameNS(ns, name)] : (el, name) => [...el.getElementsByTagName(name)]
        };
      };
      resolveURL = (url, relativeTo) => {
        try {
          url = url.replace(/%2c/, ",");
          if (relativeTo.includes(":") && !relativeTo.startsWith("OEBPS")) return new URL(url, relativeTo);
          const root = "https://invalid.invalid/";
          const obj = new URL(url, root + relativeTo);
          obj.search = "";
          return decodeURI(obj.href.replace(root, ""));
        } catch (e3) {
          console.warn(e3);
          return url;
        }
      };
      isExternal = (uri) => /^(?!blob)\\w+:/i.test(uri);
      pathRelative = (from, to) => {
        if (!from) return to;
        const as = from.replace(/\\/$/, "").split("/");
        const bs = to.replace(/\\/$/, "").split("/");
        const i3 = (as.length > bs.length ? as : bs).findIndex((_2, i4) => as[i4] !== bs[i4]);
        return i3 < 0 ? "" : Array(as.length - i3).fill("..").concat(bs.slice(i3)).join("/");
      };
      pathDirname = (str) => str.slice(0, str.lastIndexOf("/") + 1);
      replaceSeries = async (str, regex, f3) => {
        const matches = [];
        str.replace(regex, (...args) => (matches.push(args), null));
        const results = [];
        for (const args of matches) results.push(await f3(...args));
        return str.replace(regex, () => results.shift());
      };
      regexEscape = (str) => str.replace(/[-/\\\\^$*+?.()|[\\]{}]/g, "\\\\$&");
      tidy = (obj) => {
        for (const [key, val] of Object.entries(obj))
          if (val == null) delete obj[key];
          else if (Array.isArray(val)) {
            obj[key] = val.filter((x3) => x3).map((x3) => typeof x3 === "object" && !Array.isArray(x3) ? tidy(x3) : x3);
            if (!obj[key].length) delete obj[key];
            else if (obj[key].length === 1) obj[key] = obj[key][0];
          } else if (typeof val === "object") {
            obj[key] = tidy(val);
            if (!Object.keys(val).length) delete obj[key];
          }
        const keys = Object.keys(obj);
        if (keys.length === 1 && keys[0] === "name") return obj[keys[0]];
        return obj;
      };
      getPrefixes = (doc) => {
        const map = new Map(Object.entries(PREFIX));
        const value = doc.documentElement.getAttributeNS(NS.EPUB, "prefix") || doc.documentElement.getAttribute("prefix");
        if (value) for (const [, prefix, url] of value.matchAll(/(.+): +(.+)[ \\t\\r\\n]*/g)) map.set(prefix, url);
        return map;
      };
      getPropertyURL = (value, prefixes) => {
        if (!value) return null;
        const [a3, b3] = value.split(":");
        const prefix = b3 ? a3 : null;
        const reference = b3 ? b3 : a3;
        const baseURL = prefixes.get(prefix);
        return baseURL ? baseURL + reference : null;
      };
      getMetadata = (opf) => {
        const { $: $2 } = childGetter(opf, NS.OPF);
        const $metadata = $2(opf.documentElement, "metadata");
        const els = Object.groupBy([...$metadata.children], (el) => el.namespaceURI === NS.DC ? "dc" : el.namespaceURI === NS.OPF && el.localName === "meta" ? el.hasAttribute("name") ? "legacyMeta" : "meta" : "");
        const baseLang = $metadata.getAttribute("xml:lang") ?? opf.documentElement.getAttribute("xml:lang") ?? "und";
        const prefixes = getPrefixes(opf);
        const parse2 = (el) => {
          const property = el.getAttribute("property");
          const scheme = el.getAttribute("scheme");
          return {
            property: getPropertyURL(property, prefixes) ?? property,
            scheme: getPropertyURL(scheme, prefixes) ?? scheme,
            lang: el.getAttribute("xml:lang"),
            value: getElementText(el),
            props: getProperties(el),
            // \`opf:\` attributes from EPUB 2 & EPUB 3.1 (removed in EPUB 3.2)
            attrs: Object.fromEntries(Array.from(el.attributes).filter((attr) => attr.namespaceURI === NS.OPF).map((attr) => [attr.localName, attr.value]))
          };
        };
        const refines = Map.groupBy(els.meta ?? [], (el) => el.getAttribute("refines"));
        const getProperties = (el) => {
          const els2 = refines.get(el ? "#" + el.getAttribute("id") : null);
          if (!els2) return null;
          return Object.groupBy(els2.map(parse2), (x3) => x3.property);
        };
        const dc = Object.fromEntries(Object.entries(Object.groupBy(els.dc || [], (el) => el.localName)).map(([name, els2]) => [name, els2.map(parse2)]));
        const properties = getProperties() ?? {};
        const legacyMeta = Object.fromEntries(els.legacyMeta?.map((el) => [el.getAttribute("name"), el.getAttribute("content")]) ?? []);
        const one = (x3) => x3?.[0]?.value;
        const prop = (x3, p3) => one(x3?.props?.[p3]);
        const makeLanguageMap = (x3) => {
          var _a;
          if (!x3) return null;
          const alts = x3.props?.["alternate-script"] ?? [];
          const altRep = x3.attrs["alt-rep"];
          if (!alts.length && (!x3.lang || x3.lang === baseLang) && !altRep) return x3.value;
          const map = { [x3.lang ?? baseLang]: x3.value };
          if (altRep) map[x3.attrs["alt-rep-lang"]] = altRep;
          for (const y3 of alts) map[_a = y3.lang] ?? (map[_a] = y3.value);
          return map;
        };
        const makeContributor = (x3) => x3 ? {
          name: makeLanguageMap(x3),
          sortAs: makeLanguageMap(x3.props?.["file-as"]?.[0]) ?? x3.attrs["file-as"],
          role: x3.props?.role?.filter((x4) => x4.scheme === PREFIX.marc + "relators")?.map((x4) => x4.value) ?? [x3.attrs.role],
          code: prop(x3, "term") ?? x3.attrs.term,
          scheme: prop(x3, "authority") ?? x3.attrs.authority
        } : null;
        const makeCollection = (x3) => ({
          name: makeLanguageMap(x3),
          // NOTE: webpub requires number but EPUB allows values like "2.2.1"
          position: one(x3.props?.["group-position"])
        });
        const makeAltIdentifier = (x3) => {
          const { value } = x3;
          if (/^urn:/i.test(value)) return value;
          if (/^doi:/i.test(value)) return \`urn:\${value}\`;
          const type = x3.props?.["identifier-type"];
          if (!type) {
            const scheme = x3.attrs.scheme;
            if (!scheme) return value;
            if (/^(doi|isbn|uuid)$/i.test(scheme)) return \`urn:\${scheme}:\${value}\`;
            return { scheme, value };
          }
          if (type[0]?.scheme === PREFIX.onix + "codelist5") {
            const nid = ONIX5[type[0].value];
            if (nid) return \`urn:\${nid}:\${value}\`;
          }
          return value;
        };
        const belongsTo = Object.groupBy(
          properties["belongs-to-collection"] ?? [],
          (x3) => prop(x3, "collection-type") === "series" ? "series" : "collection"
        );
        const mainTitle = dc.title?.find((x3) => prop(x3, "title-type") === "main") ?? dc.title?.[0];
        const metadata = {
          identifier: getIdentifier(opf),
          title: makeLanguageMap(mainTitle),
          sortAs: makeLanguageMap(mainTitle?.props?.["file-as"]?.[0]) ?? mainTitle?.attrs?.["file-as"] ?? legacyMeta?.["calibre:title_sort"],
          subtitle: dc.title?.find((x3) => prop(x3, "title-type") === "subtitle")?.value,
          language: dc.language?.map((x3) => x3.value),
          description: one(dc.description),
          publisher: makeContributor(dc.publisher?.[0]),
          published: dc.date?.find((x3) => x3.attrs.event === "publication")?.value ?? one(dc.date),
          modified: one(properties[PREFIX.dcterms + "modified"]) ?? dc.date?.find((x3) => x3.attrs.event === "modification")?.value,
          subject: dc.subject?.map(makeContributor),
          belongsTo: {
            collection: belongsTo.collection?.map(makeCollection),
            series: belongsTo.series?.map(makeCollection) ?? legacyMeta?.["calibre:series"] ? {
              name: legacyMeta?.["calibre:series"],
              position: parseFloat(legacyMeta?.["calibre:series_index"])
            } : null
          },
          altIdentifier: dc.identifier?.map(makeAltIdentifier),
          source: dc.source?.map(makeAltIdentifier),
          // NOTE: not in webpub schema
          rights: one(dc.rights)
          // NOTE: not in webpub schema
        };
        const remapContributor = (defaultKey) => (x3) => {
          const keys = new Set(x3.role?.map((role) => RELATORS[role] ?? defaultKey));
          return [keys.size ? keys : [defaultKey], x3];
        };
        for (const [keys, val] of [].concat(
          dc.creator?.map(makeContributor)?.filter((x3) => x3 !== null)?.map(remapContributor("author")) ?? [],
          dc.contributor?.map(makeContributor)?.filter((x3) => x3 !== null)?.map(remapContributor("contributor")) ?? []
        ))
          for (const key of keys)
            if (metadata[key]) metadata[key].push(val);
            else metadata[key] = [val];
        tidy(metadata);
        if (metadata.altIdentifier === metadata.identifier)
          delete metadata.altIdentifier;
        const rendition = {};
        const media = {};
        for (const [key, val] of Object.entries(properties)) {
          if (key.startsWith(PREFIX.rendition))
            rendition[camel(key.replace(PREFIX.rendition, ""))] = one(val);
          else if (key.startsWith(PREFIX.media))
            media[camel(key.replace(PREFIX.media, ""))] = one(val);
        }
        if (media.duration) media.duration = parseClock(media.duration);
        return { metadata, rendition, media };
      };
      parseNav = (doc, resolve = (f3) => f3) => {
        const { $: $2, $$, $$$ } = childGetter(doc, NS.XHTML);
        const resolveHref = (href) => href ? decodeURI(resolve(href)) : null;
        const parseLI = (getType) => ($li) => {
          const $a = $2($li, "a") ?? $2($li, "span");
          const $ol = $2($li, "ol");
          const href = resolveHref($a?.getAttribute("href") ?? null);
          const label = getElementText($a) || $a?.getAttribute("title") || "";
          const result = { label, href, subitems: parseOL($ol) };
          if (getType) result.type = $a?.getAttributeNS(NS.EPUB, "type")?.split(/\\s/);
          return result;
        };
        const parseOL = ($ol, getType) => $ol ? $$($ol, "li").map(parseLI(!!getType)) : null;
        const parseNavEl = ($nav, getType) => parseOL($2($nav, "ol"), getType);
        const $$nav = $$$(doc, "nav");
        let toc = null;
        let pageList = null;
        let landmarks = null;
        const others = [];
        for (const $nav of $$nav) {
          const type = $nav.getAttributeNS(NS.EPUB, "type")?.split(/\\s/) ?? [];
          if (type.includes("toc")) toc ?? (toc = parseNavEl($nav));
          else if (type.includes("page-list")) pageList ?? (pageList = parseNavEl($nav));
          else if (type.includes("landmarks")) landmarks ?? (landmarks = parseNavEl($nav, true));
          else others.push({
            label: getElementText($nav.firstElementChild),
            type,
            list: parseNavEl($nav)
          });
        }
        return { toc, pageList, landmarks, others };
      };
      parseNCX = (doc, resolve = (f3) => f3) => {
        const { $: $2, $$ } = childGetter(doc, NS.NCX);
        const resolveHref = (href) => href ? decodeURI(resolve(href)) : null;
        const parseItem = (el) => {
          const $label = $2(el, "navLabel");
          const $content = $2(el, "content");
          const label = getElementText($label);
          const href = resolveHref($content.getAttribute("src"));
          if (el.localName === "navPoint") {
            const els = $$(el, "navPoint");
            return { label, href, subitems: els.length ? els.map(parseItem) : null };
          }
          return { label, href, subitems: null };
        };
        const parseList = (el, itemName) => $$(el, itemName).map(parseItem);
        const getSingle = (container, itemName) => {
          const $container = $2(doc.documentElement, container);
          return $container ? parseList($container, itemName) : null;
        };
        return {
          toc: getSingle("navMap", "navPoint"),
          pageList: getSingle("pageList", "pageTarget"),
          others: $$(doc.documentElement, "navList").map((el) => ({
            label: getElementText($2(el, "navLabel")),
            list: parseList(el, "navTarget")
          }))
        };
      };
      parseClock = (str) => {
        if (!str) return;
        const parts = str.split(":").map((x4) => parseFloat(x4));
        if (parts.length === 3) {
          const [h3, m3, s3] = parts;
          return h3 * 60 * 60 + m3 * 60 + s3;
        }
        if (parts.length === 2) {
          const [m3, s3] = parts;
          return m3 * 60 + s3;
        }
        const [x3, unit] = str.split(/(?=[^\\d.])/);
        const n3 = parseFloat(x3);
        const f3 = unit === "h" ? 60 * 60 : unit === "min" ? 60 : unit === "ms" ? 1e-3 : 1;
        return n3 * f3;
      };
      MediaOverlay = class extends EventTarget {
        constructor(book, loadXML) {
          super();
          __privateAdd(this, _MediaOverlay_instances);
          __privateAdd(this, _entries, []);
          __privateAdd(this, _lastMediaOverlayItem, null);
          __privateAdd(this, _sectionIndex, 0);
          __privateAdd(this, _audioIndex, -1);
          __privateAdd(this, _itemIndex, -1);
          __privateAdd(this, _audio, null);
          __privateAdd(this, _volume, 1);
          __privateAdd(this, _rate, 1);
          __privateAdd(this, _state);
          __publicField(this, "book");
          __publicField(this, "loadXML");
          this.book = book;
          this.loadXML = loadXML;
        }
        async start(sectionIndex, filter3 = () => true) {
          __privateGet(this, _audio)?.pause();
          const section = this.book.sections[sectionIndex];
          const href = section?.id;
          if (!href) return;
          const { mediaOverlay } = section;
          if (!mediaOverlay) return this.start(sectionIndex + 1);
          __privateSet(this, _sectionIndex, sectionIndex);
          await __privateMethod(this, _MediaOverlay_instances, loadSMIL_fn).call(this, mediaOverlay);
          for (let i3 = 0; i3 < __privateGet(this, _entries).length; i3++) {
            const { items } = __privateGet(this, _entries)[i3];
            for (let j2 = 0; j2 < items.length; j2++) {
              if (items[j2].text.split("#")[0] === href && filter3(items[j2], j2, items))
                return __privateMethod(this, _MediaOverlay_instances, play_fn).call(this, i3, j2).catch((e3) => __privateMethod(this, _MediaOverlay_instances, error_fn).call(this, e3));
            }
          }
        }
        pause() {
          __privateSet(this, _state, "paused");
          __privateGet(this, _audio)?.pause();
        }
        resume() {
          __privateSet(this, _state, "playing");
          __privateGet(this, _audio)?.play().catch((e3) => __privateMethod(this, _MediaOverlay_instances, error_fn).call(this, e3));
        }
        stop() {
          __privateSet(this, _state, "stopped");
          __privateMethod(this, _MediaOverlay_instances, stop_fn).call(this);
        }
        prev() {
          if (__privateGet(this, _itemIndex) > 0) __privateMethod(this, _MediaOverlay_instances, play_fn).call(this, __privateGet(this, _audioIndex), __privateGet(this, _itemIndex) - 1);
          else if (__privateGet(this, _audioIndex) > 0) __privateMethod(this, _MediaOverlay_instances, play_fn).call(this, __privateGet(this, _audioIndex) - 1, __privateGet(this, _entries)[__privateGet(this, _audioIndex) - 1].items.length - 1);
          else if (__privateGet(this, _sectionIndex) > 0)
            this.start(__privateGet(this, _sectionIndex) - 1, (_2, i3, items) => i3 === items.length - 1);
        }
        next() {
          __privateMethod(this, _MediaOverlay_instances, play_fn).call(this, __privateGet(this, _audioIndex), __privateGet(this, _itemIndex) + 1);
        }
        setVolume(volume) {
          __privateSet(this, _volume, volume);
          if (__privateGet(this, _audio)) __privateGet(this, _audio).volume = volume;
        }
        setRate(rate) {
          __privateSet(this, _rate, rate);
          if (__privateGet(this, _audio)) __privateGet(this, _audio).playbackRate = rate;
        }
      };
      _entries = new WeakMap();
      _lastMediaOverlayItem = new WeakMap();
      _sectionIndex = new WeakMap();
      _audioIndex = new WeakMap();
      _itemIndex = new WeakMap();
      _audio = new WeakMap();
      _volume = new WeakMap();
      _rate = new WeakMap();
      _state = new WeakMap();
      _MediaOverlay_instances = new WeakSet();
      loadSMIL_fn = async function(item) {
        if (__privateGet(this, _lastMediaOverlayItem) === item) return;
        const doc = await this.loadXML(item.href);
        if (!doc) return;
        const resolve = (href) => href ? resolveURL(href, item.href) : null;
        const { $: $2, $$$ } = childGetter(doc, NS.SMIL);
        __privateSet(this, _audioIndex, -1);
        __privateSet(this, _itemIndex, -1);
        __privateSet(this, _entries, $$$(doc, "par").reduce((arr, $par) => {
          const text = resolve($2($par, "text")?.getAttribute("src") ?? null);
          const $audio = $2($par, "audio");
          if (!text || !$audio) return arr;
          const src = resolve($audio.getAttribute("src"));
          const begin = parseClock($audio.getAttribute("clipBegin"));
          const end = parseClock($audio.getAttribute("clipEnd"));
          const last = arr.at(-1);
          if (last?.src === src) last.items.push({ text, begin, end });
          else arr.push({ src, items: [{ text, begin, end }] });
          return arr;
        }, []));
        __privateSet(this, _lastMediaOverlayItem, item);
      };
      activeAudio_get = function() {
        return __privateGet(this, _entries)[__privateGet(this, _audioIndex)];
      };
      activeItem_get = function() {
        return __privateGet(this, _MediaOverlay_instances, activeAudio_get)?.items?.[__privateGet(this, _itemIndex)];
      };
      error_fn = function(e3) {
        console.error(e3);
        this.dispatchEvent(new CustomEvent("error", { detail: e3 }));
      };
      highlight_fn = function() {
        this.dispatchEvent(new CustomEvent("highlight", { detail: __privateGet(this, _MediaOverlay_instances, activeItem_get) }));
      };
      unhighlight_fn = function() {
        this.dispatchEvent(new CustomEvent("unhighlight", { detail: __privateGet(this, _MediaOverlay_instances, activeItem_get) }));
      };
      play_fn = async function(audioIndex, itemIndex) {
        __privateMethod(this, _MediaOverlay_instances, stop_fn).call(this);
        __privateSet(this, _audioIndex, audioIndex);
        __privateSet(this, _itemIndex, itemIndex);
        const src = __privateGet(this, _MediaOverlay_instances, activeAudio_get)?.src;
        if (!src || !__privateGet(this, _MediaOverlay_instances, activeItem_get)) return this.start(__privateGet(this, _sectionIndex) + 1);
        const url = URL.createObjectURL(await this.book.loadBlob(src));
        const audio = new Audio(url);
        __privateSet(this, _audio, audio);
        audio.volume = __privateGet(this, _volume);
        audio.playbackRate = __privateGet(this, _rate);
        audio.addEventListener("timeupdate", () => {
          if (audio.paused) return;
          const t3 = audio.currentTime;
          const { items } = __privateGet(this, _MediaOverlay_instances, activeAudio_get);
          if (t3 > __privateGet(this, _MediaOverlay_instances, activeItem_get)?.end) {
            __privateMethod(this, _MediaOverlay_instances, unhighlight_fn).call(this);
            if (__privateGet(this, _itemIndex) === items.length - 1) {
              __privateMethod(this, _MediaOverlay_instances, play_fn).call(this, __privateGet(this, _audioIndex) + 1, 0).catch((e3) => __privateMethod(this, _MediaOverlay_instances, error_fn).call(this, e3));
              return;
            }
          }
          const oldIndex = __privateGet(this, _itemIndex);
          while (items[__privateGet(this, _itemIndex) + 1]?.begin <= t3) __privateWrapper(this, _itemIndex)._++;
          if (__privateGet(this, _itemIndex) !== oldIndex) __privateMethod(this, _MediaOverlay_instances, highlight_fn).call(this);
        });
        audio.addEventListener("error", () => __privateMethod(this, _MediaOverlay_instances, error_fn).call(this, new Error(\`Failed to load \${src}\`)));
        audio.addEventListener("playing", () => __privateMethod(this, _MediaOverlay_instances, highlight_fn).call(this));
        audio.addEventListener("ended", () => {
          __privateMethod(this, _MediaOverlay_instances, unhighlight_fn).call(this);
          URL.revokeObjectURL(url);
          __privateSet(this, _audio, null);
          __privateMethod(this, _MediaOverlay_instances, play_fn).call(this, audioIndex + 1, 0).catch((e3) => __privateMethod(this, _MediaOverlay_instances, error_fn).call(this, e3));
        });
        if (__privateGet(this, _state) === "paused") {
          __privateMethod(this, _MediaOverlay_instances, highlight_fn).call(this);
          audio.currentTime = __privateGet(this, _MediaOverlay_instances, activeItem_get).begin ?? 0;
        } else audio.addEventListener("canplaythrough", () => {
          audio.currentTime = __privateGet(this, _MediaOverlay_instances, activeItem_get).begin ?? 0;
          __privateSet(this, _state, "playing");
          audio.play().catch((e3) => __privateMethod(this, _MediaOverlay_instances, error_fn).call(this, e3));
        }, { once: true });
      };
      stop_fn = function() {
        if (__privateGet(this, _audio)) {
          __privateGet(this, _audio).pause();
          URL.revokeObjectURL(__privateGet(this, _audio).src);
          __privateSet(this, _audio, null);
          __privateMethod(this, _MediaOverlay_instances, unhighlight_fn).call(this);
        }
      };
      isUUID = /([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})/;
      getUUID = (opf) => {
        for (const el of opf.getElementsByTagNameNS(NS.DC, "identifier")) {
          const [id] = getElementText(el).split(":").slice(-1);
          if (isUUID.test(id)) return id;
        }
        return "";
      };
      getIdentifier = (opf) => getElementText(
        opf.getElementById(opf.documentElement.getAttribute("unique-identifier")) ?? opf.getElementsByTagNameNS(NS.DC, "identifier")[0]
      );
      deobfuscate = async (key, length, blob) => {
        const array = new Uint8Array(await blob.slice(0, length).arrayBuffer());
        length = Math.min(length, array.length);
        for (let i3 = 0; i3 < length; i3++) array[i3] = array[i3] ^ key[i3 % key.length];
        return new Blob([array, blob.slice(length)], { type: blob.type });
      };
      WebCryptoSHA1 = async (str) => {
        const data = new TextEncoder().encode(str);
        const buffer = await globalThis.crypto.subtle.digest("SHA-1", data);
        return new Uint8Array(buffer);
      };
      deobfuscators = (sha1 = WebCryptoSHA1) => ({
        "http://www.idpf.org/2008/embedding": {
          key: (opf) => sha1(getIdentifier(opf).replaceAll(/[\\u0020\\u0009\\u000d\\u000a]/g, "")),
          decode: (key, blob) => deobfuscate(key, 1040, blob)
        },
        "http://ns.adobe.com/pdf/enc#RC": {
          key: (opf) => {
            const uuid = getUUID(opf).replaceAll("-", "");
            return Uint8Array.from({ length: 16 }, (_2, i3) => parseInt(uuid.slice(i3 * 2, i3 * 2 + 2), 16));
          },
          decode: (key, blob) => deobfuscate(key, 1024, blob)
        }
      });
      Encryption = class {
        constructor(algorithms) {
          __privateAdd(this, _uris, /* @__PURE__ */ new Map());
          __privateAdd(this, _decoders, /* @__PURE__ */ new Map());
          __privateAdd(this, _algorithms);
          __privateSet(this, _algorithms, algorithms);
        }
        async init(encryption, opf) {
          if (!encryption) return;
          const data = Array.from(
            encryption.getElementsByTagNameNS(NS.ENC, "EncryptedData"),
            (el) => ({
              algorithm: el.getElementsByTagNameNS(NS.ENC, "EncryptionMethod")[0]?.getAttribute("Algorithm"),
              uri: el.getElementsByTagNameNS(NS.ENC, "CipherReference")[0]?.getAttribute("URI")
            })
          );
          for (const { algorithm, uri } of data) {
            if (!algorithm || !uri) continue;
            if (!__privateGet(this, _decoders).has(algorithm)) {
              const algo = __privateGet(this, _algorithms)[algorithm];
              if (!algo) {
                console.warn("Unknown encryption algorithm");
                continue;
              }
              const key = await algo.key(opf);
              __privateGet(this, _decoders).set(algorithm, (blob) => algo.decode(key, blob));
            }
            __privateGet(this, _uris).set(uri, algorithm);
          }
        }
        getDecoder(uri) {
          return __privateGet(this, _decoders).get(__privateGet(this, _uris).get(uri)) ?? ((x3) => x3);
        }
      };
      _uris = new WeakMap();
      _decoders = new WeakMap();
      _algorithms = new WeakMap();
      Resources = class {
        constructor({ opf, resolveHref }) {
          __publicField(this, "opf");
          __publicField(this, "manifest");
          __publicField(this, "spine");
          __publicField(this, "pageProgressionDirection");
          __publicField(this, "navPath");
          __publicField(this, "ncxPath");
          __publicField(this, "guide");
          __publicField(this, "cover");
          __publicField(this, "cfis");
          this.opf = opf;
          const { $: $2, $$, $$$ } = childGetter(opf, NS.OPF);
          const $manifest = $2(opf.documentElement, "manifest");
          const $spine = $2(opf.documentElement, "spine");
          const $$itemref = $$($spine, "itemref");
          this.manifest = $$($manifest, "item").map(getAttributes("href", "id", "media-type", "properties", "media-overlay")).map((item) => {
            const i3 = item;
            i3.href = resolveHref(i3.href);
            i3.properties = item.properties?.split(/\\s/) ?? null;
            return i3;
          });
          this.spine = $$itemref.map(getAttributes("idref", "id", "linear", "properties")).map((item) => {
            const i3 = item;
            i3.properties = item.properties?.split(/\\s/) ?? null;
            return i3;
          });
          this.pageProgressionDirection = $spine.getAttribute("page-progression-direction");
          this.navPath = this.getItemByProperty("nav")?.href;
          this.ncxPath = (this.getItemByID($spine.getAttribute("toc")) ?? this.manifest.find((item) => item.mediaType === MIME.NCX))?.href;
          const $guide = $2(opf.documentElement, "guide");
          if ($guide) this.guide = $$($guide, "reference").map(getAttributes("type", "title", "href")).map((item) => {
            const { type, title, href } = item;
            return {
              label: title,
              type: type.split(/\\s/),
              href: resolveHref(href)
            };
          });
          this.cover = this.getItemByProperty("cover-image") ?? this.getItemByID($$$(opf, "meta").find(filterAttribute("name", "cover"))?.getAttribute("content")) ?? this.manifest.find((item) => item.href.includes("cover") && item.mediaType.startsWith("image")) ?? this.getItemByHref(this.guide?.find((ref) => ref.type.includes("cover"))?.href);
          this.cfis = fromElements($$itemref);
        }
        getItemByID(id) {
          return this.manifest.find((item) => item.id === id);
        }
        getItemByHref(href) {
          return this.manifest.find((item) => item.href === href);
        }
        getItemByProperty(prop) {
          return this.manifest.find((item) => item.properties?.includes(prop));
        }
        resolveCFI(cfi) {
          const parts = parse(cfi);
          const top = (parts.parent ?? parts).shift();
          let $itemref = toElement(this.opf, top);
          if ($itemref && $itemref.nodeName !== "idref") {
            top[top.length - 1].id = null;
            $itemref = toElement(this.opf, top);
          }
          const idref = $itemref?.getAttribute("idref");
          const index = this.spine.findIndex((item) => item.idref === idref);
          const anchor = (doc) => toRange(doc, parts);
          return { index, anchor };
        }
      };
      Loader = class {
        constructor({ loadText, loadBlob, resources }) {
          __privateAdd(this, _cache, /* @__PURE__ */ new Map());
          __privateAdd(this, _children, /* @__PURE__ */ new Map());
          __privateAdd(this, _refCount, /* @__PURE__ */ new Map());
          __publicField(this, "allowScript", false);
          __publicField(this, "eventTarget", new EventTarget());
          __publicField(this, "loadText");
          __publicField(this, "loadBlob");
          __publicField(this, "manifest");
          __publicField(this, "assets");
          this.loadText = loadText;
          this.loadBlob = loadBlob;
          this.manifest = resources.manifest;
          this.assets = resources.manifest;
        }
        async createURL(href, data, type, parent) {
          if (!data) return "";
          const detail = { data, type };
          Object.defineProperty(detail, "name", { value: href });
          const event = new CustomEvent("data", { detail });
          this.eventTarget.dispatchEvent(event);
          const newData = await event.detail.data;
          const newType = await event.detail.type;
          const url = URL.createObjectURL(new Blob([newData], { type: newType }));
          __privateGet(this, _cache).set(href, url);
          __privateGet(this, _refCount).set(href, 1);
          if (parent) {
            const childList = __privateGet(this, _children).get(parent);
            if (childList) childList.push(href);
            else __privateGet(this, _children).set(parent, [href]);
          }
          return url;
        }
        ref(href, parent) {
          const childList = __privateGet(this, _children).get(parent);
          if (!childList?.includes(href)) {
            __privateGet(this, _refCount).set(href, __privateGet(this, _refCount).get(href) + 1);
            if (childList) childList.push(href);
            else __privateGet(this, _children).set(parent, [href]);
          }
          return __privateGet(this, _cache).get(href);
        }
        unref(href) {
          if (!__privateGet(this, _refCount).has(href)) return;
          const count = __privateGet(this, _refCount).get(href) - 1;
          if (count < 1) {
            URL.revokeObjectURL(__privateGet(this, _cache).get(href));
            __privateGet(this, _cache).delete(href);
            __privateGet(this, _refCount).delete(href);
            const childList = __privateGet(this, _children).get(href);
            if (childList) while (childList.length) this.unref(childList.pop());
            __privateGet(this, _children).delete(href);
          } else __privateGet(this, _refCount).set(href, count);
        }
        // load manifest item, recursively loading all resources as needed
        async loadItem(item, parents = []) {
          if (!item) return null;
          const { href, mediaType } = item;
          const isScript = MIME.JS.test(item.mediaType);
          if (isScript && !this.allowScript) return null;
          const parent = parents.at(-1);
          if (__privateGet(this, _cache).has(href)) return this.ref(href, parent) ?? null;
          const shouldReplace = (isScript || [MIME.XHTML, MIME.HTML, MIME.CSS, MIME.SVG].includes(mediaType)) && parents.every((p3) => p3 !== href);
          if (shouldReplace) return this.loadReplaced(item, parents);
          const tryLoadBlob = Promise.resolve().then(() => this.loadBlob(href));
          return this.createURL(href, tryLoadBlob, mediaType, parent);
        }
        async loadHref(href, base, parents = []) {
          if (isExternal(href)) return href;
          const path = resolveURL(href, base);
          const item = this.manifest.find((item2) => item2.href === path);
          if (!item) return href;
          return await this.loadItem(item, parents.concat(base)) ?? href;
        }
        async loadReplaced(item, parents = []) {
          const { href } = item;
          let { mediaType } = item;
          const parent = parents.at(-1);
          let str = "";
          try {
            str = await this.loadText(href);
          } catch (e3) {
            return this.createURL(href, Promise.reject(e3), mediaType, parent);
          }
          if (!str) return null;
          if ([MIME.XHTML, MIME.HTML, MIME.SVG].includes(mediaType)) {
            let doc = new DOMParser().parseFromString(str, mediaType);
            if (mediaType === MIME.XHTML && (doc.querySelector("parsererror") || !doc.documentElement?.namespaceURI)) {
              console.warn(doc.querySelector("parsererror")?.innerText ?? "Invalid XHTML");
              item.mediaType = MIME.HTML;
              mediaType = MIME.HTML;
              doc = new DOMParser().parseFromString(str, item.mediaType);
            }
            if ([MIME.XHTML, MIME.SVG].includes(item.mediaType)) {
              let child = doc.firstChild;
              while (child instanceof ProcessingInstruction) {
                if (child.data) {
                  const replacedData = await replaceSeries(
                    child.data,
                    /(?:^|\\s*)(href\\s*=\\s*['"])([^'"]*)(['"])/i,
                    (_2, p1, p22, p3) => this.loadHref(p22, href, parents).then((p23) => \`\${p1}\${p23}\${p3}\`)
                  );
                  child.replaceWith(doc.createProcessingInstruction(
                    child.target,
                    replacedData
                  ));
                }
                child = child.nextSibling;
              }
            }
            const replace = async (el, attr) => {
              el.setAttribute(
                attr,
                await this.loadHref(el.getAttribute(attr), href, parents)
              );
            };
            for (const el of doc.querySelectorAll("link[href]")) await replace(el, "href");
            for (const el of doc.querySelectorAll("[src]")) await replace(el, "src");
            for (const el of doc.querySelectorAll("[poster]")) await replace(el, "poster");
            for (const el of doc.querySelectorAll("object[data]")) await replace(el, "data");
            for (const el of doc.querySelectorAll("[*|href]:not([href])"))
              el.setAttributeNS(NS.XLINK, "href", await this.loadHref(
                el.getAttributeNS(NS.XLINK, "href"),
                href,
                parents
              ));
            for (const el of doc.querySelectorAll("style"))
              if (el.textContent) el.textContent = await this.replaceCSS(el.textContent, href, parents);
            for (const el of doc.querySelectorAll("[style]"))
              el.setAttribute(
                "style",
                await this.replaceCSS(el.getAttribute("style"), href, parents)
              );
            const result2 = new XMLSerializer().serializeToString(doc);
            return this.createURL(href, result2, item.mediaType, parent);
          }
          const result = mediaType === MIME.CSS ? await this.replaceCSS(str, href, parents) : await this.replaceString(str, href, parents);
          return this.createURL(href, result, mediaType, parent);
        }
        async replaceCSS(str, href, parents = []) {
          const replacedUrls = await replaceSeries(
            str,
            /url\\(\\s*["']?([^'"\\n]*?)\\s*["']?\\s*\\)/gi,
            (_2, url) => this.loadHref(url, href, parents).then((url2) => \`url("\${url2}")\`)
          );
          return replaceSeries(
            replacedUrls,
            /@import\\s*["']([^"'\\n]*?)["']/gi,
            (_2, url) => this.loadHref(url, href, parents).then((url2) => \`@import "\${url2}"\`)
          );
        }
        // find & replace all possible relative paths for all assets without parsing
        replaceString(str, href, parents = []) {
          const assetMap = /* @__PURE__ */ new Map();
          const urls = this.assets.map((asset) => {
            if (asset.href === href) return;
            const relative = pathRelative(pathDirname(href), asset.href);
            const relativeEnc = encodeURI(relative);
            const rootRelative = "/" + asset.href;
            const rootRelativeEnc = encodeURI(rootRelative);
            const set = /* @__PURE__ */ new Set([relative, relativeEnc, rootRelative, rootRelativeEnc]);
            for (const url of set) assetMap.set(url, asset);
            return Array.from(set);
          }).flat().filter((x3) => !!x3);
          if (!urls.length) return str;
          const regex = new RegExp(urls.map(regexEscape).join("|"), "g");
          return replaceSeries(str, regex, async (match) => await this.loadItem(
            assetMap.get(match.replace(/^\\//, "")),
            parents.concat(href)
          ) ?? match);
        }
        unloadItem(item) {
          this.unref(item?.href ?? "");
        }
        destroy() {
          for (const url of __privateGet(this, _cache).values()) URL.revokeObjectURL(url);
        }
      };
      _cache = new WeakMap();
      _children = new WeakMap();
      _refCount = new WeakMap();
      getHTMLFragment = (doc, id) => doc.getElementById(id) ?? doc.querySelector(\`[name="\${CSS.escape(id)}"]\`);
      getPageSpread = (properties) => {
        for (const p3 of properties) {
          if (p3 === "page-spread-left" || p3 === "rendition:page-spread-left")
            return "left";
          if (p3 === "page-spread-right" || p3 === "rendition:page-spread-right")
            return "right";
          if (p3 === "rendition:page-spread-center") return "center";
        }
      };
      getDisplayOptions = (doc) => {
        if (!doc) return null;
        return {
          fixedLayout: getElementText(doc.querySelector('option[name="fixed-layout"]')),
          openToSpread: getElementText(doc.querySelector('option[name="open-to-spread"]'))
        };
      };
      EPUB = class {
        constructor({ loadText, loadBlob, getSize, sha1 }) {
          __privateAdd(this, _EPUB_instances);
          __publicField(this, "parser", new DOMParser());
          __privateAdd(this, _loader, null);
          __privateAdd(this, _encryption);
          __publicField(this, "loadText");
          __publicField(this, "loadBlob");
          __publicField(this, "getSize");
          __publicField(this, "resources");
          __publicField(this, "transformTarget");
          __publicField(this, "sections");
          __publicField(this, "toc", null);
          __publicField(this, "pageList", null);
          __publicField(this, "landmarks", null);
          __publicField(this, "metadata");
          __publicField(this, "rendition");
          __publicField(this, "media");
          __publicField(this, "dir", null);
          this.loadText = loadText;
          this.loadBlob = loadBlob;
          this.getSize = getSize;
          __privateSet(this, _encryption, new Encryption(deobfuscators(sha1)));
        }
        async init() {
          var _a, _b;
          const $container = await __privateMethod(this, _EPUB_instances, loadXML_fn).call(this, "META-INF/container.xml");
          if (!$container) throw new Error("Failed to load container file");
          const opfs = Array.from(
            $container.getElementsByTagNameNS(NS.CONTAINER, "rootfile"),
            getAttributes("full-path", "media-type")
          ).filter((file) => file.mediaType === "application/oebps-package+xml");
          if (!opfs.length) throw new Error("No package document defined in container");
          const opfPath = opfs[0].fullPath;
          const opf = await __privateMethod(this, _EPUB_instances, loadXML_fn).call(this, opfPath);
          if (!opf) throw new Error("Failed to load package document");
          const $encryption = await __privateMethod(this, _EPUB_instances, loadXML_fn).call(this, "META-INF/encryption.xml");
          await __privateGet(this, _encryption).init($encryption, opf);
          this.resources = new Resources({
            opf,
            resolveHref: (url) => resolveURL(url, opfPath)
          });
          __privateSet(this, _loader, new Loader({
            loadText: this.loadText,
            loadBlob: (uri) => Promise.resolve(this.loadBlob(uri)).then(__privateGet(this, _encryption).getDecoder(uri)),
            resources: this.resources
          }));
          this.transformTarget = __privateGet(this, _loader).eventTarget;
          this.sections = this.resources.spine.map((spineItem, index) => {
            const { idref, linear, properties = [] } = spineItem;
            const item = this.resources.getItemByID(idref);
            if (!item) {
              console.warn(\`Could not find item with ID "\${idref}" in manifest\`);
              return null;
            }
            return {
              id: item.href,
              load: () => __privateGet(this, _loader).loadItem(item),
              unload: () => __privateGet(this, _loader).unloadItem(item),
              createDocument: () => this.loadDocument(item),
              size: this.getSize(item.href),
              cfi: this.resources.cfis[index],
              linear,
              pageSpread: getPageSpread(properties ?? []),
              resolveHref: (href) => resolveURL(href, item.href),
              mediaOverlay: item.mediaOverlay ? this.resources.getItemByID(item.mediaOverlay) ?? null : null
            };
          }).filter((s3) => s3 !== null);
          const { navPath, ncxPath } = this.resources;
          if (navPath) try {
            const resolve = (url) => resolveURL(url, navPath);
            const nav = parseNav(await __privateMethod(this, _EPUB_instances, loadXML_fn).call(this, navPath), resolve);
            this.toc = nav.toc;
            this.pageList = nav.pageList;
            this.landmarks = nav.landmarks ?? null;
          } catch (e3) {
            console.warn(e3);
          }
          if (!this.toc && ncxPath) try {
            const resolve = (url) => resolveURL(url, ncxPath);
            const ncx = parseNCX(await __privateMethod(this, _EPUB_instances, loadXML_fn).call(this, ncxPath), resolve);
            this.toc = ncx.toc;
            this.pageList = ncx.pageList;
          } catch (e3) {
            console.warn(e3);
          }
          this.landmarks ?? (this.landmarks = this.resources.guide ?? null);
          const { metadata, rendition, media } = getMetadata(opf);
          this.metadata = metadata;
          this.rendition = rendition;
          this.media = media;
          this.dir = this.resources.pageProgressionDirection;
          const displayOptions = getDisplayOptions(
            await __privateMethod(this, _EPUB_instances, loadXML_fn).call(this, "META-INF/com.apple.ibooks.display-options.xml") ?? await __privateMethod(this, _EPUB_instances, loadXML_fn).call(this, "META-INF/com.kobobooks.display-options.xml")
          );
          if (displayOptions) {
            if (displayOptions.fixedLayout === "true")
              (_a = this.rendition).layout ?? (_a.layout = "pre-paginated");
            if (displayOptions.openToSpread === "false") (_b = this.sections.find((section) => section.linear !== "no")).pageSpread ?? (_b.pageSpread = this.dir === "rtl" ? "left" : "right");
          }
          return this;
        }
        async loadDocument(item) {
          const str = await this.loadText(item.href);
          return this.parser.parseFromString(str, item.mediaType);
        }
        getMediaOverlay() {
          return new MediaOverlay(this, __privateMethod(this, _EPUB_instances, loadXML_fn).bind(this));
        }
        resolveCFI(cfi) {
          return this.resources.resolveCFI(cfi);
        }
        resolveHref(href) {
          const [path, hash] = href.split("#");
          const item = this.resources.getItemByHref(decodeURI(path));
          if (!item) return null;
          const index = this.resources.spine.findIndex(({ idref }) => idref === item.id);
          const anchor = hash ? (doc) => getHTMLFragment(doc, hash) : () => 0;
          return { index, anchor };
        }
        splitTOCHref(href) {
          return href?.split("#") ?? [];
        }
        getTOCFragment(doc, id) {
          return doc.getElementById(id) ?? doc.querySelector(\`[name="\${CSS.escape(id)}"]\`);
        }
        isExternal(uri) {
          return isExternal(uri);
        }
        async getCover() {
          const cover = this.resources?.cover;
          return cover?.href ? new Blob([await this.loadBlob(cover.href)], { type: cover.mediaType }) : null;
        }
        async getCalibreBookmarks() {
          const txt = await this.loadText("META-INF/calibre_bookmarks.txt");
          const magic = "encoding=json+base64:";
          if (txt?.startsWith(magic)) {
            const json = atob(txt.slice(magic.length));
            return JSON.parse(json);
          }
        }
        destroy() {
          __privateGet(this, _loader)?.destroy();
        }
      };
      _loader = new WeakMap();
      _encryption = new WeakMap();
      _EPUB_instances = new WeakSet();
      loadXML_fn = async function(uri) {
        const str = await this.loadText(uri);
        if (!str) return null;
        const doc = this.parser.parseFromString(str, MIME.XML);
        if (doc.querySelector("parsererror"))
          throw new Error(\`XML parsing error: \${uri}
\${doc.querySelector("parsererror").innerText}\`);
        return doc;
      };
    }
  });

  // src/libs/foliate-js/comic-book.ts
  var comic_book_exports = {};
  __export(comic_book_exports, {
    makeComicBook: () => makeComicBook
  });
  var makeComicBook;
  var init_comic_book = __esm({
    "src/libs/foliate-js/comic-book.ts"() {
      "use strict";
      makeComicBook = async ({ entries, loadBlob, getSize, getComment }, file) => {
        const cache = /* @__PURE__ */ new Map();
        const urls = /* @__PURE__ */ new Map();
        const load = async (name) => {
          if (cache.has(name)) return cache.get(name);
          const src = URL.createObjectURL(await loadBlob(name));
          const page = URL.createObjectURL(
            new Blob(
              [\`<body style="margin: 0"><img src="\${src}">\`],
              { type: "text/html" }
            )
          );
          urls.set(name, [src, page]);
          cache.set(name, page);
          return page;
        };
        const unload = (name) => {
          urls.get(name)?.forEach?.((url) => URL.revokeObjectURL(url));
          urls.delete(name);
          cache.delete(name);
        };
        const exts = [
          ".jpg",
          ".jpeg",
          ".png",
          ".gif",
          ".bmp",
          ".webp",
          ".svg",
          ".jxl",
          ".avif"
        ];
        const files = entries.map((entry) => entry.filename).filter((name) => exts.some((ext) => name.endsWith(ext))).sort();
        if (!files.length)
          throw new Error("No supported image files in archive");
        const book = {};
        try {
          const jsonComment = JSON.parse(await getComment?.() || "");
          const info = jsonComment["ComicBookInfo/1.0"];
          if (info) {
            const year = info.publicationYear;
            const month = info.publicationMonth;
            const mm = month && month >= 1 && month <= 12 ? String(month).padStart(2, "0") : null;
            book.metadata = {
              title: info.title || file.name,
              publisher: info.publisher,
              language: info.language || info.lang,
              author: info.credits ? info.credits.map(
                (c2) => \`\${c2.person} (\${c2.role})\`
              ).join(", ") : "",
              published: year && month ? \`\${year}-\${mm}\` : void 0
            };
          } else {
            book.metadata = { title: file.name };
          }
        } catch {
          book.metadata = { title: file.name };
        }
        book.getCover = () => loadBlob(files[0]);
        book.sections = files.map((name) => ({
          id: name,
          load: () => load(name),
          unload: () => unload(name),
          size: getSize(name)
        }));
        book.toc = files.map((name) => ({ label: name, href: name }));
        book.rendition = { layout: "pre-paginated" };
        book.resolveHref = (href) => ({
          index: book.sections.findIndex((s3) => s3.id === href)
        });
        book.splitTOCHref = (href) => [href, null];
        book.getTOCFragment = (doc) => doc.documentElement;
        book.destroy = () => {
          for (const arr of urls.values())
            for (const url of arr) URL.revokeObjectURL(url);
        };
        return book;
      };
    }
  });

  // src/libs/foliate-js/fb2.ts
  var fb2_exports = {};
  __export(fb2_exports, {
    makeFB2: () => makeFB2
  });
  var normalizeWhitespace2, getElementText2, NS2, MIME2, STYLE, TABLE, POEM, SECTION, BODY, FB2Converter, parseXML, style, template, dataID, makeFB2;
  var init_fb2 = __esm({
    "src/libs/foliate-js/fb2.ts"() {
      "use strict";
      normalizeWhitespace2 = (str) => str ? str.replace(/[\\t\\n\\f\\r ]+/g, " ").replace(/^[\\t\\n\\f\\r ]+/, "").replace(/[\\t\\n\\f\\r ]+$/, "") : "";
      getElementText2 = (el) => normalizeWhitespace2(el?.textContent);
      NS2 = {
        XLINK: "http://www.w3.org/1999/xlink",
        EPUB: "http://www.idpf.org/2007/ops",
        XHTML: "http://www.w3.org/1999/xhtml"
      };
      MIME2 = {
        XML: "application/xml",
        XHTML: "application/xhtml+xml"
      };
      STYLE = {
        strong: ["strong", "self"],
        emphasis: ["em", "self"],
        style: ["span", "self"],
        a: "anchor",
        strikethrough: ["s", "self"],
        sub: ["sub", "self"],
        sup: ["sup", "self"],
        code: ["code", "self"],
        image: "image"
      };
      TABLE = {
        tr: [
          "tr",
          {
            th: ["th", STYLE, ["colspan", "rowspan", "align", "valign"]],
            td: ["td", STYLE, ["colspan", "rowspan", "align", "valign"]]
          },
          ["align"]
        ]
      };
      POEM = {
        epigraph: ["blockquote"],
        subtitle: ["h2", STYLE],
        "text-author": ["p", STYLE],
        date: ["p", STYLE],
        stanza: "stanza"
      };
      SECTION = {
        title: [
          "header",
          {
            p: ["h1", STYLE],
            "empty-line": ["br"]
          }
        ],
        epigraph: ["blockquote", "self"],
        image: "image",
        annotation: ["aside"],
        section: ["section", "self"],
        p: ["p", STYLE],
        poem: ["blockquote", POEM],
        subtitle: ["h2", STYLE],
        cite: ["blockquote", "self"],
        "empty-line": ["br"],
        table: ["table", TABLE],
        "text-author": ["p", STYLE]
      };
      POEM["epigraph"].push(SECTION);
      BODY = {
        image: "image",
        title: [
          "section",
          {
            p: ["h1", STYLE],
            "empty-line": ["br"]
          }
        ],
        epigraph: ["section", SECTION],
        section: ["section", SECTION]
      };
      FB2Converter = class {
        constructor(fb2) {
          __publicField(this, "fb2");
          __publicField(this, "doc");
          __publicField(this, "bins");
          this.fb2 = fb2;
          this.doc = document.implementation.createDocument(NS2.XHTML, "html");
          this.bins = new Map(
            Array.from(this.fb2.getElementsByTagName("binary"), (el) => [el.id, el])
          );
        }
        getImageSrc(el) {
          const href = el.getAttributeNS(NS2.XLINK, "href");
          if (!href) return "data:,";
          const [, id] = href.split("#");
          if (!id) return href;
          const bin = this.bins.get(id);
          return bin ? \`data:\${bin.getAttribute("content-type")};base64,\${bin.textContent}\` : href;
        }
        image(node) {
          const el = this.doc.createElement("img");
          el.alt = node.getAttribute("alt") ?? "";
          el.title = node.getAttribute("title") ?? "";
          el.setAttribute("src", this.getImageSrc(node));
          return el;
        }
        anchor(node) {
          const el = this.convert(node, { a: ["a", STYLE] });
          el.setAttribute("href", node.getAttributeNS(NS2.XLINK, "href") ?? "");
          if (node.getAttribute("type") === "note")
            el.setAttributeNS(NS2.EPUB, "epub:type", "noteref");
          return el;
        }
        stanza(node) {
          const el = this.convert(node, {
            stanza: [
              "p",
              {
                title: [
                  "header",
                  {
                    p: ["strong", STYLE],
                    "empty-line": ["br"]
                  }
                ],
                subtitle: ["p", STYLE]
              }
            ]
          });
          for (const child of Array.from(node.children)) {
            if (child.nodeName === "v") {
              el.append(this.doc.createTextNode(child.textContent ?? ""));
              el.append(this.doc.createElement("br"));
            }
          }
          return el;
        }
        convert(node, def) {
          if (node.nodeType === 3)
            return this.doc.createTextNode(node.textContent ?? "");
          if (node.nodeType === 4)
            return this.doc.createCDATASection(node.textContent ?? "");
          if (node.nodeType === 8)
            return this.doc.createComment(node.textContent ?? "");
          const d2 = def?.[node.nodeName];
          if (!d2) return null;
          if (typeof d2 === "string")
            return this[d2](node);
          const [name, opts, attrs] = d2;
          const el = this.doc.createElement(name);
          if (node.id) el.id = node.id;
          el.classList.add(node.nodeName);
          if (Array.isArray(attrs)) {
            for (const attr of attrs) {
              const value = node.getAttribute(attr);
              if (value) el.setAttribute(attr, value);
            }
          }
          const childDef = opts === "self" ? def : opts;
          let child = node.firstChild;
          while (child) {
            const childEl = this.convert(child, childDef);
            if (childEl) el.append(childEl);
            child = child.nextSibling;
          }
          return el;
        }
      };
      parseXML = async (blob) => {
        const buffer = await blob.arrayBuffer();
        const str = new TextDecoder("utf-8").decode(buffer);
        const parser2 = new DOMParser();
        const doc = parser2.parseFromString(str, MIME2.XML);
        const encoding = doc.xmlEncoding || // \`Document.xmlEncoding\` is deprecated, and already removed in Firefox
        // so parse the XML declaration manually
        str.match(
          /^<\\?xml\\s+version\\s*=\\s*["']1.\\d+"\\s+encoding\\s*=\\s*["']([A-Za-z0-9._-]*)["']/
        )?.[1];
        if (encoding && encoding.toLowerCase() !== "utf-8") {
          const reStr = new TextDecoder(encoding).decode(buffer);
          return parser2.parseFromString(reStr, MIME2.XML);
        }
        return doc;
      };
      style = URL.createObjectURL(
        new Blob(
          [
            \`
@namespace epub "http://www.idpf.org/2007/ops";
body > img, section > img {
    display: block;
    margin: auto;
}
.title h1 {
    text-align: center;
}
body > section > .title, body.notesBodyType > .title {
    margin: 3em 0;
}
body.notesBodyType > section .title h1 {
    text-align: start;
}
body.notesBodyType > section .title {
    margin: 1em 0;
}
p {
    text-indent: 1em;
    margin: 0;
}
:not(p) + p, p:first-child {
    text-indent: 0;
}
.poem p {
    text-indent: 0;
    margin: 1em 0;
}
.text-author, .date {
    text-align: end;
}
.text-author:before {
    content: "\\u2014";
}
table {
    border-collapse: collapse;
}
td, th {
    padding: .25em;
}
a[epub|type~="noteref"] {
    font-size: .75em;
    vertical-align: super;
}
body:not(.notesBodyType) > .title, body:not(.notesBodyType) > .epigraph {
    margin: 3em 0;
}
\`
          ],
          { type: "text/css" }
        )
      );
      template = (html) => \`<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
    <head><link href="\${style}" rel="stylesheet" type="text/css"/></head>
    <body>\${html}</body>
</html>\`;
      dataID = "data-foliate-id";
      makeFB2 = async (blob) => {
        const book = {};
        const doc = await parseXML(blob);
        const converter = new FB2Converter(doc);
        const $2 = (x3) => doc.querySelector(x3);
        const $$ = (x3) => Array.from(doc.querySelectorAll(x3));
        const getPerson = (el) => {
          const nick = getElementText2(el.querySelector("nickname"));
          if (nick) return nick;
          const first = getElementText2(el.querySelector("first-name"));
          const middle = getElementText2(el.querySelector("middle-name"));
          const last = getElementText2(el.querySelector("last-name"));
          const name = [first, middle, last].filter((x3) => x3).join(" ");
          const sortAs = last ? [last, [first, middle].filter((x3) => x3).join(" ")].join(", ") : null;
          return { name, sortAs };
        };
        const getDate = (el) => el?.getAttribute("value") ?? getElementText2(el);
        const annotation = $2("title-info annotation");
        book.metadata = {
          title: getElementText2($2("title-info book-title")),
          identifier: getElementText2($2("document-info id")),
          language: getElementText2($2("title-info lang")),
          author: $$("title-info author").map(getPerson),
          translator: $$("title-info translator").map(getPerson),
          contributor: $$("document-info author").map(getPerson).concat($$("document-info program-used").map(getElementText2)).map(
            (x3) => Object.assign(typeof x3 === "string" ? { name: x3 } : x3, {
              role: "bkp"
            })
          ),
          publisher: getElementText2($2("publish-info publisher")),
          published: getDate($2("title-info date")),
          modified: getDate($2("document-info date")),
          description: annotation ? converter.convert(annotation, {
            annotation: ["div", SECTION]
          }).innerHTML : null,
          subject: $$("title-info genre").map(getElementText2)
        };
        if ($2("coverpage image")) {
          const src = converter.getImageSrc($2("coverpage image"));
          book.getCover = () => fetch(src).then((res) => res.blob());
        } else {
          book.getCover = () => null;
        }
        const bodyData = Array.from(doc.querySelectorAll("body"), (body) => {
          const converted = converter.convert(body, {
            body: ["body", BODY]
          });
          return [
            Array.from(converted.children, (el) => {
              const ids = [el, ...Array.from(el.querySelectorAll("[id]"))].map((e3) => e3.id);
              return { el, ids };
            }),
            converted
          ];
        });
        const urls = [];
        const sectionData = bodyData[0][0].map(({ el, ids }) => {
          const titles = Array.from(
            el.querySelectorAll(":scope > section > .title"),
            (titleEl, index) => {
              titleEl.setAttribute(dataID, index.toString());
              return { title: getElementText2(titleEl), index };
            }
          );
          return { ids, titles, el };
        }).concat(
          bodyData.slice(1).map(([sections, body]) => {
            const ids = sections.map((s3) => s3.ids).flat();
            body.classList.add("notesBodyType");
            return { ids, el: body, linear: "no" };
          })
        );
        const processedSections = sectionData.map(
          ({ ids, titles, el, linear }) => {
            const str = template(el.outerHTML);
            const sectionBlob = new Blob([str], { type: MIME2.XHTML });
            const url = URL.createObjectURL(sectionBlob);
            urls.push(url);
            const title = normalizeWhitespace2(
              el.querySelector(".title, .subtitle, p")?.textContent ?? (el.classList.contains("title") ? el.textContent : "")
            );
            return {
              ids,
              title,
              titles,
              load: () => url,
              createDocument: () => new DOMParser().parseFromString(str, MIME2.XHTML),
              // don't count image data as it'd skew the size too much
              size: sectionBlob.size - Array.from(
                el.querySelectorAll("[src]"),
                (srcEl) => srcEl.getAttribute("src")?.length ?? 0
              ).reduce((a3, b3) => a3 + b3, 0),
              linear
            };
          }
        );
        const idMap = /* @__PURE__ */ new Map();
        book.sections = processedSections.map((section, index) => {
          const { ids, load, createDocument, size, linear } = section;
          for (const id of ids) if (id) idMap.set(id, index);
          return { id: index, load, createDocument, size, linear };
        });
        book.toc = processedSections.map(({ title, titles }, index) => {
          const id = index.toString();
          return {
            label: title,
            href: id,
            subitems: titles?.length ? titles.map(({ title: subTitle, index: subIndex }) => ({
              label: subTitle,
              href: \`\${id}#\${subIndex}\`
            })) : null
          };
        }).filter((item) => !!item);
        book.resolveHref = (href) => {
          const [a3, b3] = href.split("#");
          return a3 ? (
            // the link is from the TOC
            {
              index: Number(a3),
              anchor: (d2) => d2.querySelector(\`[\${dataID}="\${b3}"]\`)
            }
          ) : (
            // link from within the page
            {
              index: idMap.get(b3),
              anchor: (d2) => d2.getElementById(b3)
            }
          );
        };
        book.splitTOCHref = (href) => href?.split("#")?.map((x3) => Number(x3)) ?? [];
        book.getTOCFragment = (d2, id) => d2.querySelector(\`[\${dataID}="\${id}"]\`);
        book.destroy = () => {
          for (const url of urls) URL.revokeObjectURL(url);
        };
        return book;
      };
    }
  });

  // src/libs/foliate-js/mobi.ts
  var mobi_exports = {};
  __export(mobi_exports, {
    MOBI: () => MOBI,
    isMOBI: () => isMOBI
  });
  var unescapeHTML, MIME3, PDB_HEADER, PALMDOC_HEADER, MOBI_HEADER, KF8_HEADER, EXTH_HEADER, INDX_HEADER, TAGX_HEADER, HUFF_HEADER, CDIC_HEADER, FDST_HEADER, FONT_HEADER, MOBI_ENCODING, EXTH_RECORD_TYPE, MOBI_LANG, concatTypedArray, concatTypedArray3, decoder, getString, getUint, getStruct, getDecoder, getVarLen, getVarLenFromEnd, countBitsSet, countUnsetEnd, decompressPalmDOC, read32Bits, huffcdic, getIndexData, getNCX, getEXTH, getFont, isMOBI, _file, _offsets, PDB, _start, _resourceStart, _decoder, _encoder, _decompress, _removeTrailingEntries, _MOBI_instances, getHeaders_fn, setup_fn, MOBI, mbpPagebreakRegex, fileposRegex, getIndent, _resourceCache, _textCache, _cache2, _sections, _fileposList, _type, MOBI6, kindleResourceRegex, kindlePosRegex, parseResourceURI, parsePosURI, makePosURI, getFragmentSelector, replaceSeries2, getPageSpread2, _cache3, _fragmentOffsets, _fragmentSelectors, _tables, _sections2, _fullRawLength, _rawHead, _rawTail, _lastLoadedHead, _lastLoadedTail, _type2, _inlineMap, _KF8_instances, setFragmentSelector_fn, KF8;
  var init_mobi = __esm({
    "src/libs/foliate-js/mobi.ts"() {
      "use strict";
      unescapeHTML = (str) => {
        if (!str) return "";
        const textarea = document.createElement("textarea");
        textarea.innerHTML = str;
        return textarea.value;
      };
      MIME3 = {
        XML: "application/xml",
        XHTML: "application/xhtml+xml",
        HTML: "text/html",
        CSS: "text/css",
        SVG: "image/svg+xml"
      };
      PDB_HEADER = {
        name: [0, 32, "string"],
        type: [60, 4, "string"],
        creator: [64, 4, "string"],
        numRecords: [76, 2, "uint"]
      };
      PALMDOC_HEADER = {
        compression: [0, 2, "uint"],
        numTextRecords: [8, 2, "uint"],
        recordSize: [10, 2, "uint"],
        encryption: [12, 2, "uint"]
      };
      MOBI_HEADER = {
        magic: [16, 4, "string"],
        length: [20, 4, "uint"],
        type: [24, 4, "uint"],
        encoding: [28, 4, "uint"],
        uid: [32, 4, "uint"],
        version: [36, 4, "uint"],
        titleOffset: [84, 4, "uint"],
        titleLength: [88, 4, "uint"],
        localeRegion: [94, 1, "uint"],
        localeLanguage: [95, 1, "uint"],
        resourceStart: [108, 4, "uint"],
        huffcdic: [112, 4, "uint"],
        numHuffcdic: [116, 4, "uint"],
        exthFlag: [128, 4, "uint"],
        trailingFlags: [240, 4, "uint"],
        indx: [244, 4, "uint"]
      };
      KF8_HEADER = {
        resourceStart: [108, 4, "uint"],
        fdst: [192, 4, "uint"],
        numFdst: [196, 4, "uint"],
        frag: [248, 4, "uint"],
        skel: [252, 4, "uint"],
        guide: [260, 4, "uint"]
      };
      EXTH_HEADER = {
        magic: [0, 4, "string"],
        length: [4, 4, "uint"],
        count: [8, 4, "uint"]
      };
      INDX_HEADER = {
        magic: [0, 4, "string"],
        length: [4, 4, "uint"],
        type: [8, 4, "uint"],
        idxt: [20, 4, "uint"],
        numRecords: [24, 4, "uint"],
        encoding: [28, 4, "uint"],
        language: [32, 4, "uint"],
        total: [36, 4, "uint"],
        ordt: [40, 4, "uint"],
        ligt: [44, 4, "uint"],
        numLigt: [48, 4, "uint"],
        numCncx: [52, 4, "uint"]
      };
      TAGX_HEADER = {
        magic: [0, 4, "string"],
        length: [4, 4, "uint"],
        numControlBytes: [8, 4, "uint"]
      };
      HUFF_HEADER = {
        magic: [0, 4, "string"],
        offset1: [8, 4, "uint"],
        offset2: [12, 4, "uint"]
      };
      CDIC_HEADER = {
        magic: [0, 4, "string"],
        length: [4, 4, "uint"],
        numEntries: [8, 4, "uint"],
        codeLength: [12, 4, "uint"]
      };
      FDST_HEADER = {
        magic: [0, 4, "string"],
        numEntries: [8, 4, "uint"]
      };
      FONT_HEADER = {
        flags: [8, 4, "uint"],
        dataStart: [12, 4, "uint"],
        keyLength: [16, 4, "uint"],
        keyStart: [20, 4, "uint"]
      };
      MOBI_ENCODING = {
        1252: "windows-1252",
        65001: "utf-8"
      };
      EXTH_RECORD_TYPE = {
        100: ["creator", "string", true],
        101: ["publisher"],
        103: ["description"],
        104: ["isbn"],
        105: ["subject", "string", true],
        106: ["date"],
        108: ["contributor", "string", true],
        109: ["rights"],
        110: ["subjectCode", "string", true],
        112: ["source", "string", true],
        113: ["asin"],
        121: ["boundary", "uint"],
        122: ["fixedLayout"],
        125: ["numResources", "uint"],
        126: ["originalResolution"],
        127: ["zeroGutter"],
        128: ["zeroMargin"],
        129: ["coverURI"],
        132: ["regionMagnification"],
        201: ["coverOffset", "uint"],
        202: ["thumbnailOffset", "uint"],
        503: ["title"],
        524: ["language", "string", true],
        527: ["pageProgressionDirection"]
      };
      MOBI_LANG = {
        1: [
          "ar",
          "ar-SA",
          "ar-IQ",
          "ar-EG",
          "ar-LY",
          "ar-DZ",
          "ar-MA",
          "ar-TN",
          "ar-OM",
          "ar-YE",
          "ar-SY",
          "ar-JO",
          "ar-LB",
          "ar-KW",
          "ar-AE",
          "ar-BH",
          "ar-QA"
        ],
        2: ["bg"],
        3: ["ca"],
        4: ["zh", "zh-TW", "zh-CN", "zh-HK", "zh-SG"],
        5: ["cs"],
        6: ["da"],
        7: ["de", "de-DE", "de-CH", "de-AT", "de-LU", "de-LI"],
        8: ["el"],
        9: [
          "en",
          "en-US",
          "en-GB",
          "en-AU",
          "en-CA",
          "en-NZ",
          "en-IE",
          "en-ZA",
          "en-JM",
          null,
          "en-BZ",
          "en-TT",
          "en-ZW",
          "en-PH"
        ],
        10: [
          "es",
          "es-ES",
          "es-MX",
          null,
          "es-GT",
          "es-CR",
          "es-PA",
          "es-DO",
          "es-VE",
          "es-CO",
          "es-PE",
          "es-AR",
          "es-EC",
          "es-CL",
          "es-UY",
          "es-PY",
          "es-BO",
          "es-SV",
          "es-HN",
          "es-NI",
          "es-PR"
        ],
        11: ["fi"],
        12: ["fr", "fr-FR", "fr-BE", "fr-CA", "fr-CH", "fr-LU", "fr-MC"],
        13: ["he"],
        14: ["hu"],
        15: ["is"],
        16: ["it", "it-IT", "it-CH"],
        17: ["ja"],
        18: ["ko"],
        19: ["nl", "nl-NL", "nl-BE"],
        20: ["no", "nb", "nn"],
        21: ["pl"],
        22: ["pt", "pt-BR", "pt-PT"],
        23: ["rm"],
        24: ["ro"],
        25: ["ru"],
        26: ["hr", null, "sr"],
        27: ["sk"],
        28: ["sq"],
        29: ["sv", "sv-SE", "sv-FI"],
        30: ["th"],
        31: ["tr"],
        32: ["ur"],
        33: ["id"],
        34: ["uk"],
        35: ["be"],
        36: ["sl"],
        37: ["et"],
        38: ["lv"],
        39: ["lt"],
        41: ["fa"],
        42: ["vi"],
        43: ["hy"],
        44: ["az"],
        45: ["eu"],
        46: ["hsb"],
        47: ["mk"],
        48: ["st"],
        49: ["ts"],
        50: ["tn"],
        52: ["xh"],
        53: ["zu"],
        54: ["af"],
        55: ["ka"],
        56: ["fo"],
        57: ["hi"],
        58: ["mt"],
        59: ["se"],
        62: ["ms"],
        63: ["kk"],
        65: ["sw"],
        67: ["uz", null, "uz-UZ"],
        68: ["tt"],
        69: ["bn"],
        70: ["pa"],
        71: ["gu"],
        72: ["or"],
        73: ["ta"],
        74: ["te"],
        75: ["kn"],
        76: ["ml"],
        77: ["as"],
        78: ["mr"],
        79: ["sa"],
        82: ["cy", "cy-GB"],
        83: ["gl", "gl-ES"],
        87: ["kok"],
        97: ["ne"],
        98: ["fy"]
      };
      concatTypedArray = (a3, b3) => {
        const result = new Uint8Array(a3.length + b3.length);
        result.set(a3);
        result.set(b3, a3.length);
        return result;
      };
      concatTypedArray3 = (a3, b3, c2) => {
        const result = new Uint8Array(a3.length + b3.length + c2.length);
        result.set(a3);
        result.set(b3, a3.length);
        result.set(c2, a3.length + b3.length);
        return result;
      };
      decoder = new TextDecoder();
      getString = (buffer) => decoder.decode(buffer);
      getUint = (buffer) => {
        if (!buffer) return;
        const l3 = buffer.byteLength;
        const func = l3 === 4 ? "getUint32" : l3 === 2 ? "getUint16" : "getUint8";
        return new DataView(buffer)[func](0);
      };
      getStruct = (def, buffer) => Object.fromEntries(Array.from(Object.entries(def)).map(([key, [start, len, type]]) => [
        key,
        (type === "string" ? getString : getUint)(buffer.slice(start, start + len))
      ]));
      getDecoder = (x3) => new TextDecoder(MOBI_ENCODING[x3]);
      getVarLen = (byteArray, i3 = 0) => {
        let value = 0, length = 0;
        for (const byte of byteArray.subarray(i3, i3 + 4)) {
          value = value << 7 | (byte & 127) >>> 0;
          length++;
          if (byte & 128) break;
        }
        return { value, length };
      };
      getVarLenFromEnd = (byteArray) => {
        let value = 0;
        for (const byte of byteArray.subarray(-4)) {
          if (byte & 128) value = 0;
          value = value << 7 | byte & 127;
        }
        return value;
      };
      countBitsSet = (x3) => {
        let count = 0;
        for (; x3 > 0; x3 = x3 >> 1) if ((x3 & 1) === 1) count++;
        return count;
      };
      countUnsetEnd = (x3) => {
        let count = 0;
        while ((x3 & 1) === 0) x3 = x3 >> 1, count++;
        return count;
      };
      decompressPalmDOC = (array) => {
        const output = [];
        for (let i3 = 0; i3 < array.length; i3++) {
          const byte = array[i3];
          if (byte === 0) output.push(0);
          else if (byte <= 8)
            for (const x3 of array.subarray(i3 + 1, (i3 += byte) + 1))
              output.push(x3);
          else if (byte <= 127) output.push(byte);
          else if (byte <= 191) {
            const bytes = byte << 8 | array[i3++ + 1];
            const distance = (bytes & 16383) >>> 3;
            const length = (bytes & 7) + 3;
            for (let j2 = 0; j2 < length; j2++)
              output.push(output[output.length - distance]);
          } else output.push(32, byte ^ 128);
        }
        return Uint8Array.from(output);
      };
      read32Bits = (byteArray, from) => {
        const startByte = from >> 3;
        const end = from + 32;
        const endByte = end >> 3;
        let bits = 0n;
        for (let i3 = startByte; i3 <= endByte; i3++)
          bits = bits << 8n | BigInt(byteArray[i3] ?? 0);
        return bits >> 8n - BigInt(end & 7) & 0xffffffffn;
      };
      huffcdic = async (mobi, loadRecord) => {
        const huffRecord = await loadRecord(mobi.huffcdic);
        const { magic, offset1, offset2 } = getStruct(HUFF_HEADER, huffRecord);
        if (magic !== "HUFF") throw new Error("Invalid HUFF record");
        const table1 = Array.from({ length: 256 }, (_2, i3) => offset1 + i3 * 4).map((offset) => getUint(huffRecord.slice(offset, offset + 4))).map((x3) => [x3 & 128, x3 & 31, x3 >>> 8]);
        const table2 = [null].concat(Array.from({ length: 32 }, (_2, i3) => offset2 + i3 * 8).map((offset) => [
          getUint(huffRecord.slice(offset, offset + 4)),
          getUint(huffRecord.slice(offset + 4, offset + 8))
        ]));
        const dictionary = [];
        for (let i3 = 1; i3 < mobi.numHuffcdic; i3++) {
          const record = await loadRecord(mobi.huffcdic + i3);
          const cdic = getStruct(CDIC_HEADER, record);
          if (cdic.magic !== "CDIC") throw new Error("Invalid CDIC record");
          const n3 = Math.min(1 << cdic.codeLength, cdic.numEntries - dictionary.length);
          const buffer = record.slice(cdic.length);
          for (let i4 = 0; i4 < n3; i4++) {
            const offset = getUint(buffer.slice(i4 * 2, i4 * 2 + 2));
            const x3 = getUint(buffer.slice(offset, offset + 2));
            const length = x3 & 32767;
            const decompressed = x3 & 32768;
            const value = new Uint8Array(
              buffer.slice(offset + 2, offset + 2 + length)
            );
            dictionary.push([value, decompressed]);
          }
        }
        const decompress = (byteArray) => {
          let output = new Uint8Array();
          const bitLength = byteArray.byteLength * 8;
          for (let i3 = 0; i3 < bitLength; ) {
            const bits = Number(read32Bits(byteArray, i3));
            let [found, codeLength, value] = table1[bits >>> 24];
            if (!found) {
              while (bits >>> 32 - codeLength < table2[codeLength][0])
                codeLength += 1;
              value = table2[codeLength][1];
            }
            if ((i3 += codeLength) > bitLength) break;
            const code = value - (bits >>> 32 - codeLength);
            let [result, decompressed] = dictionary[code];
            if (!decompressed) {
              result = decompress(result);
              dictionary[code] = [result, true];
            }
            output = concatTypedArray(output, result);
          }
          return output;
        };
        return decompress;
      };
      getIndexData = async (indxIndex, loadRecord) => {
        const indxRecord = await loadRecord(indxIndex);
        const indx = getStruct(INDX_HEADER, indxRecord);
        if (indx.magic !== "INDX") throw new Error("Invalid INDX record");
        const decoder2 = getDecoder(indx.encoding);
        const tagxBuffer = indxRecord.slice(indx.length);
        const tagx = getStruct(TAGX_HEADER, tagxBuffer);
        if (tagx.magic !== "TAGX") throw new Error("Invalid TAGX section");
        const numTags = (tagx.length - 12) / 4;
        const tagTable = Array.from({ length: numTags }, (_2, i3) => new Uint8Array(tagxBuffer.slice(12 + i3 * 4, 12 + i3 * 4 + 4)));
        const cncx = {};
        let cncxRecordOffset = 0;
        for (let i3 = 0; i3 < indx.numCncx; i3++) {
          const record = await loadRecord(indxIndex + indx.numRecords + i3 + 1);
          const array = new Uint8Array(record);
          for (let pos = 0; pos < array.byteLength; ) {
            const index = pos;
            const { value, length } = getVarLen(array, pos);
            pos += length;
            const result = record.slice(pos, pos + value);
            pos += value;
            cncx[cncxRecordOffset + index] = decoder2.decode(result);
          }
          cncxRecordOffset += 65536;
        }
        const table = [];
        for (let i3 = 0; i3 < indx.numRecords; i3++) {
          const record = await loadRecord(indxIndex + 1 + i3);
          const array = new Uint8Array(record);
          const indx2 = getStruct(INDX_HEADER, record);
          if (indx2.magic !== "INDX") throw new Error("Invalid INDX record");
          for (let j2 = 0; j2 < indx2.numRecords; j2++) {
            const offsetOffset = indx2.idxt + 4 + 2 * j2;
            const offset = getUint(record.slice(offsetOffset, offsetOffset + 2));
            const length = getUint(record.slice(offset, offset + 1));
            const name = getString(record.slice(offset + 1, offset + 1 + length));
            const tags = [];
            const startPos = offset + 1 + length;
            let controlByteIndex = 0;
            let pos = startPos + tagx.numControlBytes;
            for (const [tag, numValues, mask, end] of tagTable) {
              if (end & 1) {
                controlByteIndex++;
                continue;
              }
              const offset2 = startPos + controlByteIndex;
              const value = getUint(record.slice(offset2, offset2 + 1)) & mask;
              if (value === mask) {
                if (countBitsSet(mask) > 1) {
                  const { value: value2, length: length2 } = getVarLen(array, pos);
                  tags.push([tag, null, value2, numValues]);
                  pos += length2;
                } else tags.push([tag, 1, null, numValues]);
              } else tags.push([tag, value >> countUnsetEnd(mask), null, numValues]);
            }
            const tagMap = {};
            for (const [tag, valueCount, valueBytes, numValues] of tags) {
              const values = [];
              if (valueCount != null) {
                for (let i4 = 0; i4 < valueCount * numValues; i4++) {
                  const { value, length: length2 } = getVarLen(array, pos);
                  values.push(value);
                  pos += length2;
                }
              } else {
                let count = 0;
                while (count < valueBytes) {
                  const { value, length: length2 } = getVarLen(array, pos);
                  values.push(value);
                  pos += length2;
                  count += length2;
                }
              }
              tagMap[tag] = values;
            }
            table.push({ name, tagMap });
          }
        }
        return { table, cncx };
      };
      getNCX = async (indxIndex, loadRecord) => {
        const { table, cncx } = await getIndexData(indxIndex, loadRecord);
        const items = table.map(({ tagMap }, index) => ({
          index,
          offset: tagMap[1]?.[0],
          size: tagMap[2]?.[0],
          label: cncx[tagMap[3]] ?? "",
          headingLevel: tagMap[4]?.[0],
          pos: tagMap[6],
          parent: tagMap[21]?.[0],
          firstChild: tagMap[22]?.[0],
          lastChild: tagMap[23]?.[0]
        }));
        const getChildren = (item) => {
          if (item.firstChild == null) return item;
          item.children = items.filter((x3) => x3.parent === item.index).map(getChildren);
          return item;
        };
        return items.filter((item) => item.headingLevel === 0).map(getChildren);
      };
      getEXTH = (buf, encoding) => {
        const { magic, count } = getStruct(EXTH_HEADER, buf);
        if (magic !== "EXTH") throw new Error("Invalid EXTH header");
        const decoder2 = getDecoder(encoding);
        const results = {};
        let offset = 12;
        for (let i3 = 0; i3 < count; i3++) {
          const type = getUint(buf.slice(offset, offset + 4));
          const length = getUint(buf.slice(offset + 4, offset + 8));
          if (type in EXTH_RECORD_TYPE) {
            const [name, typ, many] = EXTH_RECORD_TYPE[type];
            const data = buf.slice(offset + 8, offset + length);
            const value = typ === "uint" ? getUint(data) : decoder2.decode(data);
            if (many) {
              results[name] ?? (results[name] = []);
              results[name].push(value);
            } else results[name] = value;
          }
          offset += length;
        }
        return results;
      };
      getFont = async (buf, unzlib) => {
        const { flags, dataStart, keyLength, keyStart } = getStruct(FONT_HEADER, buf);
        const array = new Uint8Array(buf.slice(dataStart));
        if (flags & 2) {
          const bytes = keyLength === 16 ? 1024 : 1040;
          const key = new Uint8Array(buf.slice(keyStart, keyStart + keyLength));
          const length = Math.min(bytes, array.length);
          for (var i3 = 0; i3 < length; i3++) array[i3] = array[i3] ^ key[i3 % key.length];
        }
        if (flags & 1) try {
          return await unzlib(array);
        } catch (e3) {
          console.warn(e3);
          console.warn("Failed to decompress font");
        }
        return array;
      };
      isMOBI = async (file) => {
        const magic = getString(await file.slice(60, 68).arrayBuffer());
        return magic === "BOOKMOBI";
      };
      PDB = class {
        constructor() {
          __privateAdd(this, _file);
          __privateAdd(this, _offsets);
          __publicField(this, "pdb");
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async open(file) {
          __privateSet(this, _file, file);
          const pdb = getStruct(PDB_HEADER, await file.slice(0, 78).arrayBuffer());
          this.pdb = pdb;
          const buffer = await file.slice(78, 78 + pdb.numRecords * 8).arrayBuffer();
          __privateSet(this, _offsets, Array.from(
            { length: pdb.numRecords },
            (_2, i3) => getUint(buffer.slice(i3 * 8, i3 * 8 + 4))
          ).map((x3, i3, a3) => [x3, a3[i3 + 1]]));
        }
        loadRecord(index) {
          const offsets = __privateGet(this, _offsets)[index];
          if (!offsets) throw new RangeError("Record index out of bounds");
          return __privateGet(this, _file).slice(...offsets).arrayBuffer();
        }
        async loadMagic(index) {
          const start = __privateGet(this, _offsets)[index][0];
          return getString(await __privateGet(this, _file).slice(start, start + 4).arrayBuffer());
        }
      };
      _file = new WeakMap();
      _offsets = new WeakMap();
      MOBI = class extends PDB {
        constructor({ unzlib }) {
          super();
          __privateAdd(this, _MOBI_instances);
          __privateAdd(this, _start, 0);
          __privateAdd(this, _resourceStart);
          __privateAdd(this, _decoder);
          __privateAdd(this, _encoder);
          __privateAdd(this, _decompress);
          __privateAdd(this, _removeTrailingEntries);
          __publicField(this, "unzlib");
          __publicField(this, "headers");
          this.unzlib = unzlib;
        }
        async open(file) {
          await super.open(file);
          this.headers = __privateMethod(this, _MOBI_instances, getHeaders_fn).call(this, await super.loadRecord(0));
          __privateSet(this, _resourceStart, this.headers.mobi.resourceStart);
          let isKF8 = this.headers.mobi.version >= 8;
          if (!isKF8) {
            const boundary = this.headers.exth?.boundary;
            if (boundary != null && boundary < 4294967295) try {
              this.headers = __privateMethod(this, _MOBI_instances, getHeaders_fn).call(this, await super.loadRecord(boundary));
              __privateSet(this, _start, boundary);
              isKF8 = true;
            } catch (e3) {
              console.warn(e3);
              console.warn("Failed to open KF8; falling back to MOBI");
            }
          }
          await __privateMethod(this, _MOBI_instances, setup_fn).call(this);
          return isKF8 ? new KF8(this).init() : new MOBI6(this).init();
        }
        decode(...args) {
          return __privateGet(this, _decoder).decode(...args);
        }
        encode(...args) {
          return __privateGet(this, _encoder).encode(...args);
        }
        loadRecord(index) {
          return super.loadRecord(__privateGet(this, _start) + index);
        }
        loadMagic(index) {
          return super.loadMagic(__privateGet(this, _start) + index);
        }
        loadText(index) {
          return this.loadRecord(index + 1).then((buf) => new Uint8Array(buf)).then(__privateGet(this, _removeTrailingEntries)).then(__privateGet(this, _decompress));
        }
        async loadResource(index) {
          const buf = await super.loadRecord(__privateGet(this, _resourceStart) + index);
          const magic = getString(buf.slice(0, 4));
          if (magic === "FONT") return getFont(buf, this.unzlib);
          if (magic === "VIDE" || magic === "AUDI") return buf.slice(12);
          return buf;
        }
        getNCX() {
          const index = this.headers.mobi.indx;
          if (index < 4294967295) return getNCX(index, this.loadRecord.bind(this));
        }
        getMetadata() {
          const { mobi, exth } = this.headers;
          return {
            identifier: mobi.uid.toString(),
            title: unescapeHTML(exth?.title || this.decode(mobi.title)),
            author: exth?.creator?.map(unescapeHTML),
            publisher: unescapeHTML(exth?.publisher),
            language: exth?.language ?? mobi.language,
            published: exth?.date,
            description: unescapeHTML(exth?.description),
            subject: exth?.subject?.map(unescapeHTML),
            rights: unescapeHTML(exth?.rights),
            contributor: exth?.contributor
          };
        }
        async getCover() {
          const { exth } = this.headers;
          const offset = exth?.coverOffset != null && exth.coverOffset < 4294967295 ? exth.coverOffset : exth?.thumbnailOffset != null && exth.thumbnailOffset < 4294967295 ? exth.thumbnailOffset : null;
          if (offset != null) {
            const buf = await this.loadResource(offset);
            return new Blob([buf]);
          }
        }
      };
      _start = new WeakMap();
      _resourceStart = new WeakMap();
      _decoder = new WeakMap();
      _encoder = new WeakMap();
      _decompress = new WeakMap();
      _removeTrailingEntries = new WeakMap();
      _MOBI_instances = new WeakSet();
      getHeaders_fn = function(buf) {
        const palmdoc = getStruct(PALMDOC_HEADER, buf);
        const mobi = getStruct(MOBI_HEADER, buf);
        if (mobi.magic !== "MOBI") throw new Error("Missing MOBI header");
        const { titleOffset, titleLength, localeLanguage, localeRegion } = mobi;
        mobi.title = buf.slice(titleOffset, titleOffset + titleLength);
        const lang = MOBI_LANG[localeLanguage];
        mobi.language = lang?.[localeRegion >> 2] ?? lang?.[0];
        const exth = mobi.exthFlag & 64 ? getEXTH(buf.slice(mobi.length + 16), mobi.encoding) : null;
        const kf8 = mobi.version >= 8 ? getStruct(KF8_HEADER, buf) : null;
        return { palmdoc, mobi, exth, kf8 };
      };
      setup_fn = async function() {
        const { palmdoc, mobi } = this.headers;
        __privateSet(this, _decoder, getDecoder(mobi.encoding));
        __privateSet(this, _encoder, new TextEncoder());
        const { compression } = palmdoc;
        __privateSet(this, _decompress, compression === 1 ? (f3) => f3 : compression === 2 ? decompressPalmDOC : compression === 17480 ? await huffcdic(mobi, this.loadRecord.bind(this)) : null);
        if (!__privateGet(this, _decompress)) throw new Error("Unknown compression type");
        const { trailingFlags } = mobi;
        const multibyte = trailingFlags & 1;
        const numTrailingEntries = countBitsSet(trailingFlags >>> 1);
        __privateSet(this, _removeTrailingEntries, (array) => {
          for (let i3 = 0; i3 < numTrailingEntries; i3++) {
            const length = getVarLenFromEnd(array);
            array = array.subarray(0, -length);
          }
          if (multibyte) {
            const length = (array[array.length - 1] & 3) + 1;
            array = array.subarray(0, -length);
          }
          return array;
        });
      };
      mbpPagebreakRegex = /<\\s*(?:mbp:)?pagebreak[^>]*>/gi;
      fileposRegex = /<[^<>]+filepos=['"]{0,1}(\\d+)[^<>]*>/gi;
      getIndent = (el) => {
        let x3 = 0;
        while (el) {
          const parent = el.parentElement;
          if (parent) {
            const tag = parent.tagName.toLowerCase();
            if (tag === "p") x3 += 1.5;
            else if (tag === "blockquote") x3 += 2;
          }
          el = parent;
        }
        return x3;
      };
      MOBI6 = class {
        constructor(mobi) {
          __publicField(this, "parser", new DOMParser());
          __publicField(this, "serializer", new XMLSerializer());
          __privateAdd(this, _resourceCache, /* @__PURE__ */ new Map());
          __privateAdd(this, _textCache, /* @__PURE__ */ new Map());
          __privateAdd(this, _cache2, /* @__PURE__ */ new Map());
          __privateAdd(this, _sections);
          __privateAdd(this, _fileposList, []);
          __privateAdd(this, _type, MIME3.HTML);
          __publicField(this, "mobi");
          __publicField(this, "sections");
          __publicField(this, "landmarks");
          __publicField(this, "toc");
          __publicField(this, "metadata");
          __publicField(this, "getCover");
          this.mobi = mobi;
        }
        async init() {
          let array = new Uint8Array();
          for (let i3 = 0; i3 < this.mobi.headers.palmdoc.numTextRecords; i3++)
            array = concatTypedArray(array, await this.mobi.loadText(i3));
          const str = Array.from(
            new Uint8Array(array),
            (c2) => String.fromCharCode(c2)
          ).join("");
          __privateSet(this, _sections, [0].concat(Array.from(str.matchAll(mbpPagebreakRegex), (m3) => m3.index)).map((x3, i3, a3) => str.slice(x3, a3[i3 + 1])).map((str2) => Uint8Array.from(str2, (x3) => x3.charCodeAt(0))).map((raw) => ({ book: this, raw })).reduce((arr, x3) => {
            const last = arr[arr.length - 1];
            x3.start = last?.end ?? 0;
            x3.end = x3.start + x3.raw.byteLength;
            return arr.concat(x3);
          }, []));
          this.sections = __privateGet(this, _sections).map((section, index) => ({
            id: index,
            load: () => this.loadSection(section),
            createDocument: () => this.createDocument(section),
            size: section.end - section.start
          }));
          try {
            this.landmarks = await this.getGuide();
            const tocHref = this.landmarks.find(({ type }) => type?.includes("toc"))?.href;
            if (tocHref) {
              const { index } = this.resolveHref(tocHref);
              const doc = await this.sections[index].createDocument();
              let lastItem;
              let lastLevel = 0;
              let lastIndent = 0;
              const lastLevelOfIndent = /* @__PURE__ */ new Map();
              const lastParentOfLevel = /* @__PURE__ */ new Map();
              this.toc = Array.from(doc.querySelectorAll("a[filepos]")).reduce((arr, a3) => {
                const indent = getIndent(a3);
                const item = {
                  label: a3.innerText?.trim() ?? "",
                  href: \`filepos:\${a3.getAttribute("filepos")}\`
                };
                const level = indent > lastIndent ? lastLevel + 1 : indent === lastIndent ? lastLevel : lastLevelOfIndent.get(indent) ?? Math.max(0, lastLevel - 1);
                if (level > lastLevel) {
                  if (lastItem) {
                    lastItem.subitems ?? (lastItem.subitems = []);
                    lastItem.subitems.push(item);
                    lastParentOfLevel.set(level, lastItem);
                  } else arr.push(item);
                } else {
                  const parent = lastParentOfLevel.get(level);
                  if (parent) parent.subitems.push(item);
                  else arr.push(item);
                }
                lastItem = item;
                lastLevel = level;
                lastIndent = indent;
                lastLevelOfIndent.set(indent, level);
                return arr;
              }, []);
            }
          } catch (e3) {
            console.warn(e3);
          }
          __privateSet(this, _fileposList, [...new Set(
            Array.from(str.matchAll(fileposRegex), (m3) => m3[1])
          )].map((filepos) => ({ filepos, number: Number(filepos) })).sort((a3, b3) => a3.number - b3.number));
          this.metadata = this.mobi.getMetadata();
          this.getCover = this.mobi.getCover.bind(this.mobi);
          return this;
        }
        async getGuide() {
          const doc = await this.createDocument(__privateGet(this, _sections)[0]);
          return Array.from(doc.getElementsByTagName("reference"), (ref) => ({
            label: ref.getAttribute("title"),
            type: ref.getAttribute("type")?.split(/\\s/),
            href: \`filepos:\${ref.getAttribute("filepos")}\`
          }));
        }
        async loadResource(index) {
          if (__privateGet(this, _resourceCache).has(index)) return __privateGet(this, _resourceCache).get(index);
          const raw = await this.mobi.loadResource(index);
          const url = URL.createObjectURL(new Blob([raw]));
          __privateGet(this, _resourceCache).set(index, url);
          return url;
        }
        async loadRecindex(recindex) {
          return this.loadResource(Number(recindex) - 1);
        }
        async replaceResources(doc) {
          for (const img of doc.querySelectorAll("img[recindex]")) {
            const recindex = img.getAttribute("recindex");
            try {
              img.src = await this.loadRecindex(recindex);
            } catch {
              console.warn(\`Failed to load image \${recindex}\`);
            }
          }
          for (const media of doc.querySelectorAll("[mediarecindex]")) {
            const mediarecindex = media.getAttribute("mediarecindex");
            const recindex = media.getAttribute("recindex");
            try {
              media.src = await this.loadRecindex(mediarecindex);
              if (recindex) media.poster = await this.loadRecindex(recindex);
            } catch {
              console.warn(\`Failed to load media \${mediarecindex}\`);
            }
          }
          for (const a3 of doc.querySelectorAll("[filepos]")) {
            const filepos = a3.getAttribute("filepos");
            a3.href = \`filepos:\${filepos}\`;
          }
        }
        async loadText(section) {
          if (__privateGet(this, _textCache).has(section)) return __privateGet(this, _textCache).get(section);
          const { raw } = section;
          const fileposList = __privateGet(this, _fileposList).filter(({ number }) => number >= section.start && number < section.end).map((obj) => ({ ...obj, offset: obj.number - section.start }));
          let arr = raw;
          if (fileposList.length) {
            arr = raw.subarray(0, fileposList[0].offset);
            fileposList.forEach(({ filepos, offset }, i3) => {
              const next = fileposList[i3 + 1];
              const a3 = this.mobi.encode(\`<a id="filepos\${filepos}"></a>\`);
              arr = concatTypedArray3(arr, a3, raw.subarray(offset, next?.offset));
            });
          }
          const str = this.mobi.decode(arr).replaceAll(mbpPagebreakRegex, "");
          __privateGet(this, _textCache).set(section, str);
          return str;
        }
        async createDocument(section) {
          const str = await this.loadText(section);
          return this.parser.parseFromString(str, __privateGet(this, _type));
        }
        async loadSection(section) {
          if (__privateGet(this, _cache2).has(section)) return __privateGet(this, _cache2).get(section);
          const doc = await this.createDocument(section);
          const style2 = doc.createElement("style");
          doc.head.append(style2);
          style2.append(doc.createTextNode(\`blockquote {
            margin-block-start: 0;
            margin-block-end: 0;
            margin-inline-start: 1em;
            margin-inline-end: 0;
        }\`));
          await this.replaceResources(doc);
          const result = this.serializer.serializeToString(doc);
          const url = URL.createObjectURL(new Blob([result], { type: __privateGet(this, _type) }));
          __privateGet(this, _cache2).set(section, url);
          return url;
        }
        resolveHref(href) {
          const filepos = href.match(/filepos:(.*)/)[1];
          const number = Number(filepos);
          const index = __privateGet(this, _sections).findIndex((section) => section.end > number);
          const anchor = (doc) => doc.getElementById(\`filepos\${filepos}\`);
          return { index, anchor };
        }
        splitTOCHref(href) {
          const filepos = href.match(/filepos:(.*)/)[1];
          const number = Number(filepos);
          const index = __privateGet(this, _sections).findIndex((section) => section.end > number);
          return [index, \`filepos\${filepos}\`];
        }
        getTOCFragment(doc, id) {
          return doc.getElementById(id);
        }
        isExternal(uri) {
          return /^(?!blob|filepos)\\w+:/i.test(uri);
        }
        destroy() {
          for (const url of __privateGet(this, _resourceCache).values()) URL.revokeObjectURL(url);
          for (const url of __privateGet(this, _cache2).values()) URL.revokeObjectURL(url);
        }
      };
      _resourceCache = new WeakMap();
      _textCache = new WeakMap();
      _cache2 = new WeakMap();
      _sections = new WeakMap();
      _fileposList = new WeakMap();
      _type = new WeakMap();
      kindleResourceRegex = /kindle:(flow|embed):(\\w+)(?:\\?mime=(\\w+\\/[-+.\\w]+))?/;
      kindlePosRegex = /kindle:pos:fid:(\\w+):off:(\\w+)/;
      parseResourceURI = (str) => {
        const [resourceType, id, type] = str.match(kindleResourceRegex).slice(1);
        return { resourceType, id: parseInt(id, 32), type };
      };
      parsePosURI = (str) => {
        const [fid, off] = str.match(kindlePosRegex).slice(1);
        return { fid: parseInt(fid, 32), off: parseInt(off, 32) };
      };
      makePosURI = (fid = 0, off = 0) => \`kindle:pos:fid:\${fid.toString(32).toUpperCase().padStart(4, "0")}:off:\${off.toString(32).toUpperCase().padStart(10, "0")}\`;
      getFragmentSelector = (str) => {
        const match = str.match(/\\s(id|name|aid)\\s*=\\s*['"]([^'"]*)['"]/i);
        if (!match) return;
        const [, attr, value] = match;
        return \`[\${attr}="\${CSS.escape(value)}"]\`;
      };
      replaceSeries2 = async (str, regex, f3) => {
        const matches = [];
        str.replace(regex, (...args) => (matches.push(args), null));
        const results = [];
        for (const args of matches) results.push(await f3(...args));
        return str.replace(regex, () => results.shift());
      };
      getPageSpread2 = (properties) => {
        for (const p3 of properties) {
          if (p3 === "page-spread-left" || p3 === "rendition:page-spread-left")
            return "left";
          if (p3 === "page-spread-right" || p3 === "rendition:page-spread-right")
            return "right";
          if (p3 === "rendition:page-spread-center") return "center";
        }
      };
      KF8 = class {
        constructor(mobi) {
          __privateAdd(this, _KF8_instances);
          __publicField(this, "parser", new DOMParser());
          __publicField(this, "serializer", new XMLSerializer());
          __privateAdd(this, _cache3, /* @__PURE__ */ new Map());
          __privateAdd(this, _fragmentOffsets, /* @__PURE__ */ new Map());
          __privateAdd(this, _fragmentSelectors, /* @__PURE__ */ new Map());
          __privateAdd(this, _tables, {});
          __privateAdd(this, _sections2);
          __privateAdd(this, _fullRawLength);
          __privateAdd(this, _rawHead, new Uint8Array());
          __privateAdd(this, _rawTail, new Uint8Array());
          __privateAdd(this, _lastLoadedHead, -1);
          __privateAdd(this, _lastLoadedTail, -1);
          __privateAdd(this, _type2, MIME3.XHTML);
          __privateAdd(this, _inlineMap, /* @__PURE__ */ new Map());
          __publicField(this, "mobi");
          __publicField(this, "sections");
          __publicField(this, "toc");
          __publicField(this, "landmarks");
          __publicField(this, "dir");
          __publicField(this, "rendition");
          __publicField(this, "metadata");
          __publicField(this, "getCover");
          this.mobi = mobi;
        }
        async init() {
          const loadRecord = this.mobi.loadRecord.bind(this.mobi);
          const { kf8 } = this.mobi.headers;
          try {
            const fdstBuffer = await loadRecord(kf8.fdst);
            const fdst = getStruct(FDST_HEADER, fdstBuffer);
            if (fdst.magic !== "FDST") throw new Error("Missing FDST record");
            const fdstTable = Array.from(
              { length: fdst.numEntries },
              (_2, i3) => 12 + i3 * 8
            ).map((offset) => [
              getUint(fdstBuffer.slice(offset, offset + 4)),
              getUint(fdstBuffer.slice(offset + 4, offset + 8))
            ]);
            __privateGet(this, _tables).fdstTable = fdstTable;
            __privateSet(this, _fullRawLength, fdstTable[fdstTable.length - 1][1]);
          } catch {
          }
          const skelTable = (await getIndexData(kf8.skel, loadRecord)).table.map(({ name, tagMap }, index) => ({
            index,
            name,
            numFrag: tagMap[1][0],
            offset: tagMap[6][0],
            length: tagMap[6][1]
          }));
          const fragData = await getIndexData(kf8.frag, loadRecord);
          const fragTable = fragData.table.map(({ name, tagMap }) => ({
            insertOffset: parseInt(name),
            selector: fragData.cncx[tagMap[2][0]],
            index: tagMap[4][0],
            offset: tagMap[6][0],
            length: tagMap[6][1]
          }));
          __privateGet(this, _tables).skelTable = skelTable;
          __privateGet(this, _tables).fragTable = fragTable;
          __privateSet(this, _sections2, skelTable.reduce((arr, skel) => {
            const last = arr[arr.length - 1];
            const fragStart = last?.fragEnd ?? 0, fragEnd = fragStart + skel.numFrag;
            const frags = fragTable.slice(fragStart, fragEnd);
            const length = skel.length + frags.map((f3) => f3.length).reduce((a3, b3) => a3 + b3);
            const totalLength = (last?.totalLength ?? 0) + length;
            return arr.concat({ skel, frags, fragEnd, length, totalLength });
          }, []));
          const resources = await this.getResourcesByMagic(["RESC", "PAGE"]);
          const pageSpreads = /* @__PURE__ */ new Map();
          if (resources.RESC) {
            const buf = await this.mobi.loadRecord(resources.RESC);
            const str = this.mobi.decode(buf.slice(16)).replace(/\\0/g, "");
            const index = str.search(/\\?>/);
            const xmlStr = \`<package>\${str.slice(index)}</package>\`;
            const opf = this.parser.parseFromString(xmlStr, MIME3.XML);
            for (const $itemref of opf.querySelectorAll("spine > itemref")) {
              const i3 = parseInt($itemref.getAttribute("skelid"));
              pageSpreads.set(i3, getPageSpread2(
                $itemref.getAttribute("properties")?.split(" ") ?? []
              ));
            }
          }
          this.sections = __privateGet(this, _sections2).map((section, index) => section.frags.length ? {
            id: index,
            load: () => this.loadSection(section),
            createDocument: () => this.createDocument(section),
            size: section.length,
            pageSpread: pageSpreads.get(index)
          } : { linear: "no" });
          try {
            const ncx = await this.mobi.getNCX();
            const map = ({ label, pos, children }) => {
              const [fid, off] = pos;
              const href = makePosURI(fid, off);
              const arr = __privateGet(this, _fragmentOffsets).get(fid);
              if (arr) arr.push(off);
              else __privateGet(this, _fragmentOffsets).set(fid, [off]);
              return { label: unescapeHTML(label), href, subitems: children?.map(map) };
            };
            this.toc = ncx?.map(map);
            this.landmarks = await this.getGuide();
          } catch (e3) {
            console.warn(e3);
          }
          const { exth } = this.mobi.headers;
          this.dir = exth?.pageProgressionDirection;
          this.rendition = {
            layout: exth?.fixedLayout === "true" ? "pre-paginated" : "reflowable",
            viewport: Object.fromEntries(exth?.originalResolution?.split("x")?.slice(0, 2)?.map((x3, i3) => [i3 ? "height" : "width", x3]) ?? [])
          };
          this.metadata = this.mobi.getMetadata();
          this.getCover = this.mobi.getCover.bind(this.mobi);
          return this;
        }
        // is this really the only way of getting to RESC, PAGE, etc.?
        async getResourcesByMagic(keys) {
          const results = {};
          const start = this.mobi.headers.kf8.resourceStart;
          const end = this.mobi.pdb.numRecords;
          for (let i3 = start; i3 < end; i3++) {
            try {
              const magic = await this.mobi.loadMagic(i3);
              const match = keys.find((key) => key === magic);
              if (match) results[match] = i3;
            } catch {
            }
          }
          return results;
        }
        async getGuide() {
          const index = this.mobi.headers.kf8.guide;
          if (index < 4294967295) {
            const loadRecord = this.mobi.loadRecord.bind(this.mobi);
            const { table, cncx } = await getIndexData(index, loadRecord);
            return table.map(({ name, tagMap }) => ({
              label: cncx[tagMap[1][0]] ?? "",
              type: name?.split(/\\s/),
              href: makePosURI(tagMap[6]?.[0] ?? tagMap[3]?.[0])
            }));
          }
        }
        async loadResourceBlob(str) {
          const { resourceType, id, type } = parseResourceURI(str);
          const raw = resourceType === "flow" ? await this.loadFlow(id) : await this.mobi.loadResource(id - 1);
          const result = [MIME3.XHTML, MIME3.HTML, MIME3.CSS, MIME3.SVG].includes(type) ? await this.replaceResources(this.mobi.decode(raw)) : raw;
          const doc = type === MIME3.SVG ? this.parser.parseFromString(result, type) : null;
          return [
            new Blob([result], { type }),
            // SVG wrappers need to be inlined
            // as browsers don't allow external resources when loading SVG as an image
            doc?.getElementsByTagNameNS("http://www.w3.org/2000/svg", "image")?.length ? doc.documentElement : null
          ];
        }
        async loadResource(str) {
          if (__privateGet(this, _cache3).has(str)) return __privateGet(this, _cache3).get(str);
          const [blob, inline] = await this.loadResourceBlob(str);
          const url = inline ? str : URL.createObjectURL(blob);
          if (inline) __privateGet(this, _inlineMap).set(url, inline);
          __privateGet(this, _cache3).set(str, url);
          return url;
        }
        replaceResources(str) {
          const regex = new RegExp(kindleResourceRegex, "g");
          return replaceSeries2(str, regex, this.loadResource.bind(this));
        }
        // NOTE: there doesn't seem to be a way to access text randomly?
        // how to know the decompressed size of the records without decompressing?
        // 4096 is just the maximum size
        async loadRaw(start, end) {
          const distanceHead = end - __privateGet(this, _rawHead).length;
          const distanceEnd = __privateGet(this, _fullRawLength) == null ? Infinity : __privateGet(this, _fullRawLength) - __privateGet(this, _rawTail).length - start;
          if (distanceHead < 0 || distanceHead < distanceEnd) {
            while (__privateGet(this, _rawHead).length < end) {
              const index = ++__privateWrapper(this, _lastLoadedHead)._;
              const data = await this.mobi.loadText(index);
              __privateSet(this, _rawHead, concatTypedArray(__privateGet(this, _rawHead), data));
            }
            return __privateGet(this, _rawHead).slice(start, end);
          }
          while (__privateGet(this, _fullRawLength) - __privateGet(this, _rawTail).length > start) {
            const index = this.mobi.headers.palmdoc.numTextRecords - 1 - ++__privateWrapper(this, _lastLoadedTail)._;
            const data = await this.mobi.loadText(index);
            __privateSet(this, _rawTail, concatTypedArray(data, __privateGet(this, _rawTail)));
          }
          const rawTailStart = __privateGet(this, _fullRawLength) - __privateGet(this, _rawTail).length;
          return __privateGet(this, _rawTail).slice(start - rawTailStart, end - rawTailStart);
        }
        loadFlow(index) {
          if (index < 4294967295)
            return this.loadRaw(...__privateGet(this, _tables).fdstTable[index]);
        }
        async loadText(section) {
          const { skel, frags, length } = section;
          const raw = await this.loadRaw(skel.offset, skel.offset + length);
          let skeleton = raw.slice(0, skel.length);
          for (const frag of frags) {
            const insertOffset = frag.insertOffset - skel.offset;
            const offset = skel.length + frag.offset;
            const fragRaw = raw.slice(offset, offset + frag.length);
            skeleton = concatTypedArray3(
              skeleton.slice(0, insertOffset),
              fragRaw,
              skeleton.slice(insertOffset)
            );
            const offsets = __privateGet(this, _fragmentOffsets).get(frag.index);
            if (offsets) for (const offset2 of offsets) {
              const str = this.mobi.decode(fragRaw).slice(offset2);
              const selector = getFragmentSelector(str);
              __privateMethod(this, _KF8_instances, setFragmentSelector_fn).call(this, frag.index, offset2, selector);
            }
          }
          return this.mobi.decode(skeleton);
        }
        async createDocument(section) {
          const str = await this.loadText(section);
          return this.parser.parseFromString(str, __privateGet(this, _type2));
        }
        async loadSection(section) {
          if (__privateGet(this, _cache3).has(section)) return __privateGet(this, _cache3).get(section);
          const str = await this.loadText(section);
          const replaced = await this.replaceResources(str);
          let doc = this.parser.parseFromString(replaced, __privateGet(this, _type2));
          if (doc.querySelector("parsererror") || !doc.documentElement?.namespaceURI) {
            __privateSet(this, _type2, MIME3.HTML);
            doc = this.parser.parseFromString(replaced, __privateGet(this, _type2));
          }
          for (const [url2, node] of __privateGet(this, _inlineMap)) {
            for (const el of doc.querySelectorAll(\`img[src="\${url2}"]\`))
              el.replaceWith(node);
          }
          const url = URL.createObjectURL(
            new Blob([this.serializer.serializeToString(doc)], { type: __privateGet(this, _type2) })
          );
          __privateGet(this, _cache3).set(section, url);
          return url;
        }
        getIndexByFID(fid) {
          return __privateGet(this, _sections2).findIndex((section) => section.frags.some((frag) => frag.index === fid));
        }
        async resolveHref(href) {
          const { fid, off } = parsePosURI(href);
          const index = this.getIndexByFID(fid);
          if (index < 0) return;
          const saved = __privateGet(this, _fragmentSelectors).get(fid)?.get(off);
          if (saved) return { index, anchor: (doc) => doc.querySelector(saved) };
          const { skel, frags } = __privateGet(this, _sections2)[index];
          const frag = frags.find((frag2) => frag2.index === fid);
          const offset = skel.offset + skel.length + frag.offset;
          const fragRaw = await this.loadRaw(offset, offset + frag.length);
          const str = this.mobi.decode(fragRaw).slice(off);
          const selector = getFragmentSelector(str);
          __privateMethod(this, _KF8_instances, setFragmentSelector_fn).call(this, fid, off, selector);
          const anchor = (doc) => doc.querySelector(selector);
          return { index, anchor };
        }
        splitTOCHref(href) {
          const pos = parsePosURI(href);
          const index = this.getIndexByFID(pos.fid);
          return [index, pos];
        }
        getTOCFragment(doc, { fid, off }) {
          const selector = __privateGet(this, _fragmentSelectors).get(fid)?.get(off);
          return doc.querySelector(selector);
        }
        isExternal(uri) {
          return /^(?!blob|kindle)\\w+:/i.test(uri);
        }
        destroy() {
          for (const url of __privateGet(this, _cache3).values()) URL.revokeObjectURL(url);
        }
      };
      _cache3 = new WeakMap();
      _fragmentOffsets = new WeakMap();
      _fragmentSelectors = new WeakMap();
      _tables = new WeakMap();
      _sections2 = new WeakMap();
      _fullRawLength = new WeakMap();
      _rawHead = new WeakMap();
      _rawTail = new WeakMap();
      _lastLoadedHead = new WeakMap();
      _lastLoadedTail = new WeakMap();
      _type2 = new WeakMap();
      _inlineMap = new WeakMap();
      _KF8_instances = new WeakSet();
      setFragmentSelector_fn = function(id, offset, selector) {
        const map = __privateGet(this, _fragmentSelectors).get(id);
        if (map) map.set(offset, selector);
        else {
          const map2 = /* @__PURE__ */ new Map();
          __privateGet(this, _fragmentSelectors).set(id, map2);
          map2.set(offset, selector);
        }
      };
    }
  });

  // src/libs/foliate-js/vendor/fflate.js
  var fflate_exports = {};
  __export(fflate_exports, {
    unzlibSync: () => A2
  });
  function A2(r3, a3) {
    return E2(r3.subarray((e3 = r3, n3 = a3 && a3.dictionary, (8 != (15 & e3[0]) || e3[0] >> 4 > 7 || (e3[0] << 8 | e3[1]) % 31) && T2(6, "invalid zlib data"), (e3[1] >> 5 & 1) == +!n3 && T2(6, "invalid zlib data: " + (32 & e3[1] ? "need" : "unexpected") + " dictionary"), 2 + (e3[1] >> 3 & 4)), -4), { i: 2 }, a3 && a3.out, a3 && a3.dictionary);
    var e3, n3;
  }
  var r2, a2, e2, n2, i2, t2, f2, o2, v2, l2, w2, u2, c2, d2, b2, s2, h2, y2, g2, p2, k2, m2, x2, T2, E2, z2, U2;
  var init_fflate = __esm({
    "src/libs/foliate-js/vendor/fflate.js"() {
      "use strict";
      r2 = Uint8Array;
      a2 = Uint16Array;
      e2 = Int32Array;
      n2 = new r2([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 0, 0, 0]);
      i2 = new r2([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 0, 0]);
      t2 = new r2([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
      f2 = function(r3, n3) {
        for (var i3 = new a2(31), t3 = 0; t3 < 31; ++t3) i3[t3] = n3 += 1 << r3[t3 - 1];
        var f3 = new e2(i3[30]);
        for (t3 = 1; t3 < 30; ++t3) for (var o3 = i3[t3]; o3 < i3[t3 + 1]; ++o3) f3[o3] = o3 - i3[t3] << 5 | t3;
        return { b: i3, r: f3 };
      };
      o2 = f2(n2, 2);
      v2 = o2.b;
      l2 = o2.r;
      v2[28] = 258, l2[258] = 28;
      for (u2 = f2(i2, 0).b, c2 = new a2(32768), d2 = 0; d2 < 32768; ++d2) {
        w2 = (43690 & d2) >> 1 | (21845 & d2) << 1;
        w2 = (61680 & (w2 = (52428 & w2) >> 2 | (13107 & w2) << 2)) >> 4 | (3855 & w2) << 4, c2[d2] = ((65280 & w2) >> 8 | (255 & w2) << 8) >> 1;
      }
      b2 = function(r3, e3, n3) {
        for (var i3 = r3.length, t3 = 0, f3 = new a2(e3); t3 < i3; ++t3) r3[t3] && ++f3[r3[t3] - 1];
        var o3, v3 = new a2(e3);
        for (t3 = 1; t3 < e3; ++t3) v3[t3] = v3[t3 - 1] + f3[t3 - 1] << 1;
        if (n3) {
          o3 = new a2(1 << e3);
          var l3 = 15 - e3;
          for (t3 = 0; t3 < i3; ++t3) if (r3[t3]) for (var u2 = t3 << 4 | r3[t3], d2 = e3 - r3[t3], w2 = v3[r3[t3] - 1]++ << d2, b3 = w2 | (1 << d2) - 1; w2 <= b3; ++w2) o3[c2[w2] >> l3] = u2;
        } else for (o3 = new a2(i3), t3 = 0; t3 < i3; ++t3) r3[t3] && (o3[t3] = c2[v3[r3[t3] - 1]++] >> 15 - r3[t3]);
        return o3;
      };
      s2 = new r2(288);
      for (d2 = 0; d2 < 144; ++d2) s2[d2] = 8;
      for (d2 = 144; d2 < 256; ++d2) s2[d2] = 9;
      for (d2 = 256; d2 < 280; ++d2) s2[d2] = 7;
      for (d2 = 280; d2 < 288; ++d2) s2[d2] = 8;
      h2 = new r2(32);
      for (d2 = 0; d2 < 32; ++d2) h2[d2] = 5;
      y2 = b2(s2, 9, 1);
      g2 = b2(h2, 5, 1);
      p2 = function(r3) {
        for (var a3 = r3[0], e3 = 1; e3 < r3.length; ++e3) r3[e3] > a3 && (a3 = r3[e3]);
        return a3;
      };
      k2 = function(r3, a3, e3) {
        var n3 = a3 / 8 | 0;
        return (r3[n3] | r3[n3 + 1] << 8) >> (7 & a3) & e3;
      };
      m2 = function(r3, a3) {
        var e3 = a3 / 8 | 0;
        return (r3[e3] | r3[e3 + 1] << 8 | r3[e3 + 2] << 16) >> (7 & a3);
      };
      x2 = ["unexpected EOF", "invalid block type", "invalid length/literal", "invalid distance", "stream finished", "no stream handler", , "no callback", "invalid UTF-8 data", "extra field too long", "date not in range 1980-2099", "filename too long", "stream finishing", "invalid zip data"];
      T2 = function(r3, a3, e3) {
        var n3 = new Error(a3 || x2[r3]);
        if (n3.code = r3, Error.captureStackTrace && Error.captureStackTrace(n3, T2), !e3) throw n3;
        return n3;
      };
      E2 = function(a3, e3, f3, o3) {
        var l3 = a3.length, c2 = o3 ? o3.length : 0;
        if (!l3 || e3.f && !e3.l) return f3 || new r2(0);
        var d2 = !f3, w2 = d2 || 2 != e3.i, s3 = e3.i;
        d2 && (f3 = new r2(3 * l3));
        var h3 = function(a4) {
          var e4 = f3.length;
          if (a4 > e4) {
            var n3 = new r2(Math.max(2 * e4, a4));
            n3.set(f3), f3 = n3;
          }
        }, x3 = e3.f || 0, E3 = e3.p || 0, z3 = e3.b || 0, A3 = e3.l, U3 = e3.d, D2 = e3.m, F2 = e3.n, M2 = 8 * l3;
        do {
          if (!A3) {
            x3 = k2(a3, E3, 1);
            var S2 = k2(a3, E3 + 1, 3);
            if (E3 += 3, !S2) {
              var I2 = a3[(N2 = 4 + ((E3 + 7) / 8 | 0)) - 4] | a3[N2 - 3] << 8, O2 = N2 + I2;
              if (O2 > l3) {
                s3 && T2(0);
                break;
              }
              w2 && h3(z3 + I2), f3.set(a3.subarray(N2, O2), z3), e3.b = z3 += I2, e3.p = E3 = 8 * O2, e3.f = x3;
              continue;
            }
            if (1 == S2) A3 = y2, U3 = g2, D2 = 9, F2 = 5;
            else if (2 == S2) {
              var j2 = k2(a3, E3, 31) + 257, q2 = k2(a3, E3 + 10, 15) + 4, B2 = j2 + k2(a3, E3 + 5, 31) + 1;
              E3 += 14;
              for (var C2 = new r2(B2), G2 = new r2(19), H2 = 0; H2 < q2; ++H2) G2[t2[H2]] = k2(a3, E3 + 3 * H2, 7);
              E3 += 3 * q2;
              var J2 = p2(G2), K2 = (1 << J2) - 1, L2 = b2(G2, J2, 1);
              for (H2 = 0; H2 < B2; ) {
                var N2, P2 = L2[k2(a3, E3, K2)];
                if (E3 += 15 & P2, (N2 = P2 >> 4) < 16) C2[H2++] = N2;
                else {
                  var Q2 = 0, R2 = 0;
                  for (16 == N2 ? (R2 = 3 + k2(a3, E3, 3), E3 += 2, Q2 = C2[H2 - 1]) : 17 == N2 ? (R2 = 3 + k2(a3, E3, 7), E3 += 3) : 18 == N2 && (R2 = 11 + k2(a3, E3, 127), E3 += 7); R2--; ) C2[H2++] = Q2;
                }
              }
              var V2 = C2.subarray(0, j2), W2 = C2.subarray(j2);
              D2 = p2(V2), F2 = p2(W2), A3 = b2(V2, D2, 1), U3 = b2(W2, F2, 1);
            } else T2(1);
            if (E3 > M2) {
              s3 && T2(0);
              break;
            }
          }
          w2 && h3(z3 + 131072);
          for (var X2 = (1 << D2) - 1, Y2 = (1 << F2) - 1, Z2 = E3; ; Z2 = E3) {
            var $2 = (Q2 = A3[m2(a3, E3) & X2]) >> 4;
            if ((E3 += 15 & Q2) > M2) {
              s3 && T2(0);
              break;
            }
            if (Q2 || T2(2), $2 < 256) f3[z3++] = $2;
            else {
              if (256 == $2) {
                Z2 = E3, A3 = null;
                break;
              }
              var _2 = $2 - 254;
              if ($2 > 264) {
                var rr = n2[H2 = $2 - 257];
                _2 = k2(a3, E3, (1 << rr) - 1) + v2[H2], E3 += rr;
              }
              var ar = U3[m2(a3, E3) & Y2], er = ar >> 4;
              ar || T2(3), E3 += 15 & ar;
              W2 = u2[er];
              if (er > 3) {
                rr = i2[er];
                W2 += m2(a3, E3) & (1 << rr) - 1, E3 += rr;
              }
              if (E3 > M2) {
                s3 && T2(0);
                break;
              }
              w2 && h3(z3 + 131072);
              var nr = z3 + _2;
              if (z3 < W2) {
                var ir = c2 - W2, tr = Math.min(W2, nr);
                for (ir + z3 < 0 && T2(3); z3 < tr; ++z3) f3[z3] = o3[ir + z3];
              }
              for (; z3 < nr; ++z3) f3[z3] = f3[z3 - W2];
            }
          }
          e3.l = A3, e3.p = Z2, e3.b = z3, e3.f = x3, A3 && (x3 = 1, e3.m = D2, e3.d = U3, e3.n = F2);
        } while (!x3);
        return z3 != f3.length && d2 ? function(a4, e4, n3) {
          return (null == n3 || n3 > a4.length) && (n3 = a4.length), new r2(a4.subarray(e4, n3));
        }(f3, 0, z3) : f3.subarray(0, z3);
      };
      z2 = new r2(0);
      U2 = "undefined" != typeof TextDecoder && new TextDecoder();
      try {
        U2.decode(z2, { stream: true });
      } catch (r3) {
      }
    }
  });

  // node_modules/construct-style-sheets-polyfill/dist/adoptedStyleSheets.js
  var init_adoptedStyleSheets = __esm({
    "node_modules/construct-style-sheets-polyfill/dist/adoptedStyleSheets.js"() {
      (function() {
        "use strict";
        if (typeof document === "undefined" || "adoptedStyleSheets" in document) {
          return;
        }
        var hasShadyCss = "ShadyCSS" in window && !ShadyCSS.nativeShadow;
        var bootstrapper = document.implementation.createHTMLDocument("");
        var closedShadowRootRegistry = /* @__PURE__ */ new WeakMap();
        var _DOMException = typeof DOMException === "object" ? Error : DOMException;
        var defineProperty = Object.defineProperty;
        var forEach = Array.prototype.forEach;
        var importPattern = /@import.+?;?$/gm;
        function rejectImports(contents) {
          var _contents = contents.replace(importPattern, "");
          if (_contents !== contents) {
            console.warn("@import rules are not allowed here. See https://github.com/WICG/construct-stylesheets/issues/119#issuecomment-588352418");
          }
          return _contents.trim();
        }
        function isElementConnected(element) {
          return "isConnected" in element ? element.isConnected : document.contains(element);
        }
        function unique(arr) {
          return arr.filter(function(value, index) {
            return arr.indexOf(value) === index;
          });
        }
        function diff(arr1, arr2) {
          return arr1.filter(function(value) {
            return arr2.indexOf(value) === -1;
          });
        }
        function removeNode(node) {
          node.parentNode.removeChild(node);
        }
        function getShadowRoot(element) {
          return element.shadowRoot || closedShadowRootRegistry.get(element);
        }
        var cssStyleSheetMethods = [
          "addRule",
          "deleteRule",
          "insertRule",
          "removeRule"
        ];
        var NonConstructedStyleSheet = CSSStyleSheet;
        var nonConstructedProto = NonConstructedStyleSheet.prototype;
        nonConstructedProto.replace = function() {
          return Promise.reject(new _DOMException("Can't call replace on non-constructed CSSStyleSheets."));
        };
        nonConstructedProto.replaceSync = function() {
          throw new _DOMException("Failed to execute 'replaceSync' on 'CSSStyleSheet': Can't call replaceSync on non-constructed CSSStyleSheets.");
        };
        function isCSSStyleSheetInstance(instance) {
          return typeof instance === "object" ? proto$1.isPrototypeOf(instance) || nonConstructedProto.isPrototypeOf(instance) : false;
        }
        function isNonConstructedStyleSheetInstance(instance) {
          return typeof instance === "object" ? nonConstructedProto.isPrototypeOf(instance) : false;
        }
        var $basicStyleElement = /* @__PURE__ */ new WeakMap();
        var $locations = /* @__PURE__ */ new WeakMap();
        var $adoptersByLocation = /* @__PURE__ */ new WeakMap();
        var $appliedMethods = /* @__PURE__ */ new WeakMap();
        function addAdopterLocation(sheet, location) {
          var adopter = document.createElement("style");
          $adoptersByLocation.get(sheet).set(location, adopter);
          $locations.get(sheet).push(location);
          return adopter;
        }
        function getAdopterByLocation(sheet, location) {
          return $adoptersByLocation.get(sheet).get(location);
        }
        function removeAdopterLocation(sheet, location) {
          $adoptersByLocation.get(sheet).delete(location);
          $locations.set(sheet, $locations.get(sheet).filter(function(_location) {
            return _location !== location;
          }));
        }
        function restyleAdopter(sheet, adopter) {
          requestAnimationFrame(function() {
            adopter.textContent = $basicStyleElement.get(sheet).textContent;
            $appliedMethods.get(sheet).forEach(function(command) {
              return adopter.sheet[command.method].apply(adopter.sheet, command.args);
            });
          });
        }
        function checkInvocationCorrectness(self) {
          if (!$basicStyleElement.has(self)) {
            throw new TypeError("Illegal invocation");
          }
        }
        function ConstructedStyleSheet() {
          var self = this;
          var style2 = document.createElement("style");
          bootstrapper.body.appendChild(style2);
          $basicStyleElement.set(self, style2);
          $locations.set(self, []);
          $adoptersByLocation.set(self, /* @__PURE__ */ new WeakMap());
          $appliedMethods.set(self, []);
        }
        var proto$1 = ConstructedStyleSheet.prototype;
        proto$1.replace = function replace(contents) {
          try {
            this.replaceSync(contents);
            return Promise.resolve(this);
          } catch (e3) {
            return Promise.reject(e3);
          }
        };
        proto$1.replaceSync = function replaceSync(contents) {
          checkInvocationCorrectness(this);
          if (typeof contents === "string") {
            var self_1 = this;
            $basicStyleElement.get(self_1).textContent = rejectImports(contents);
            $appliedMethods.set(self_1, []);
            $locations.get(self_1).forEach(function(location) {
              if (location.isConnected()) {
                restyleAdopter(self_1, getAdopterByLocation(self_1, location));
              }
            });
          }
        };
        defineProperty(proto$1, "cssRules", {
          configurable: true,
          enumerable: true,
          get: function cssRules() {
            checkInvocationCorrectness(this);
            return $basicStyleElement.get(this).sheet.cssRules;
          }
        });
        defineProperty(proto$1, "media", {
          configurable: true,
          enumerable: true,
          get: function media() {
            checkInvocationCorrectness(this);
            return $basicStyleElement.get(this).sheet.media;
          }
        });
        cssStyleSheetMethods.forEach(function(method) {
          proto$1[method] = function() {
            var self = this;
            checkInvocationCorrectness(self);
            var args = arguments;
            $appliedMethods.get(self).push({ method, args });
            $locations.get(self).forEach(function(location) {
              if (location.isConnected()) {
                var sheet = getAdopterByLocation(self, location).sheet;
                sheet[method].apply(sheet, args);
              }
            });
            var basicSheet = $basicStyleElement.get(self).sheet;
            return basicSheet[method].apply(basicSheet, args);
          };
        });
        defineProperty(ConstructedStyleSheet, Symbol.hasInstance, {
          configurable: true,
          value: isCSSStyleSheetInstance
        });
        var defaultObserverOptions = {
          childList: true,
          subtree: true
        };
        var locations = /* @__PURE__ */ new WeakMap();
        function getAssociatedLocation(element) {
          var location = locations.get(element);
          if (!location) {
            location = new Location(element);
            locations.set(element, location);
          }
          return location;
        }
        function attachAdoptedStyleSheetProperty(constructor) {
          defineProperty(constructor.prototype, "adoptedStyleSheets", {
            configurable: true,
            enumerable: true,
            get: function() {
              return getAssociatedLocation(this).sheets;
            },
            set: function(sheets) {
              getAssociatedLocation(this).update(sheets);
            }
          });
        }
        function traverseWebComponents(node, callback) {
          var iter = document.createNodeIterator(
            node,
            NodeFilter.SHOW_ELEMENT,
            function(foundNode) {
              return getShadowRoot(foundNode) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            },
            null,
            false
          );
          for (var next = void 0; next = iter.nextNode(); ) {
            callback(getShadowRoot(next));
          }
        }
        var $element = /* @__PURE__ */ new WeakMap();
        var $uniqueSheets = /* @__PURE__ */ new WeakMap();
        var $observer = /* @__PURE__ */ new WeakMap();
        function isExistingAdopter(self, element) {
          return element instanceof HTMLStyleElement && $uniqueSheets.get(self).some(function(sheet) {
            return getAdopterByLocation(sheet, self);
          });
        }
        function getAdopterContainer(self) {
          var element = $element.get(self);
          return element instanceof Document ? element.body : element;
        }
        function adopt(self) {
          var styleList = document.createDocumentFragment();
          var sheets = $uniqueSheets.get(self);
          var observer = $observer.get(self);
          var container = getAdopterContainer(self);
          observer.disconnect();
          sheets.forEach(function(sheet) {
            styleList.appendChild(getAdopterByLocation(sheet, self) || addAdopterLocation(sheet, self));
          });
          container.insertBefore(styleList, null);
          observer.observe(container, defaultObserverOptions);
          sheets.forEach(function(sheet) {
            restyleAdopter(sheet, getAdopterByLocation(sheet, self));
          });
        }
        function Location(element) {
          var self = this;
          self.sheets = [];
          $element.set(self, element);
          $uniqueSheets.set(self, []);
          $observer.set(self, new MutationObserver(function(mutations, observer) {
            if (!document) {
              observer.disconnect();
              return;
            }
            mutations.forEach(function(mutation) {
              if (!hasShadyCss) {
                forEach.call(mutation.addedNodes, function(node) {
                  if (!(node instanceof Element)) {
                    return;
                  }
                  traverseWebComponents(node, function(root) {
                    getAssociatedLocation(root).connect();
                  });
                });
              }
              forEach.call(mutation.removedNodes, function(node) {
                if (!(node instanceof Element)) {
                  return;
                }
                if (isExistingAdopter(self, node)) {
                  adopt(self);
                }
                if (!hasShadyCss) {
                  traverseWebComponents(node, function(root) {
                    getAssociatedLocation(root).disconnect();
                  });
                }
              });
            });
          }));
        }
        Location.prototype = {
          isConnected: function() {
            var element = $element.get(this);
            return element instanceof Document ? element.readyState !== "loading" : isElementConnected(element.host);
          },
          connect: function() {
            var container = getAdopterContainer(this);
            $observer.get(this).observe(container, defaultObserverOptions);
            if ($uniqueSheets.get(this).length > 0) {
              adopt(this);
            }
            traverseWebComponents(container, function(root) {
              getAssociatedLocation(root).connect();
            });
          },
          disconnect: function() {
            $observer.get(this).disconnect();
          },
          update: function(sheets) {
            var self = this;
            var locationType = $element.get(self) === document ? "Document" : "ShadowRoot";
            if (!Array.isArray(sheets)) {
              throw new TypeError("Failed to set the 'adoptedStyleSheets' property on " + locationType + ": Iterator getter is not callable.");
            }
            if (!sheets.every(isCSSStyleSheetInstance)) {
              throw new TypeError("Failed to set the 'adoptedStyleSheets' property on " + locationType + ": Failed to convert value to 'CSSStyleSheet'");
            }
            if (sheets.some(isNonConstructedStyleSheetInstance)) {
              throw new TypeError("Failed to set the 'adoptedStyleSheets' property on " + locationType + ": Can't adopt non-constructed stylesheets");
            }
            self.sheets = sheets;
            var oldUniqueSheets = $uniqueSheets.get(self);
            var uniqueSheets = unique(sheets);
            var removedSheets = diff(oldUniqueSheets, uniqueSheets);
            removedSheets.forEach(function(sheet) {
              removeNode(getAdopterByLocation(sheet, self));
              removeAdopterLocation(sheet, self);
            });
            $uniqueSheets.set(self, uniqueSheets);
            if (self.isConnected() && uniqueSheets.length > 0) {
              adopt(self);
            }
          }
        };
        window.CSSStyleSheet = ConstructedStyleSheet;
        attachAdoptedStyleSheetProperty(Document);
        if ("ShadowRoot" in window) {
          attachAdoptedStyleSheetProperty(ShadowRoot);
          var proto = Element.prototype;
          var attach_1 = proto.attachShadow;
          proto.attachShadow = function attachShadow(init) {
            var root = attach_1.call(this, init);
            if (init.mode === "closed") {
              closedShadowRootRegistry.set(this, root);
            }
            return root;
          };
        }
        var documentLocation = getAssociatedLocation(document);
        if (documentLocation.isConnected()) {
          documentLocation.connect();
        } else {
          document.addEventListener("DOMContentLoaded", documentLocation.connect.bind(documentLocation));
        }
      })();
    }
  });

  // src/libs/foliate-js/fixed-layout.ts
  var fixed_layout_exports = {};
  __export(fixed_layout_exports, {
    FixedLayout: () => FixedLayout
  });
  var parseViewport, getViewport, _root, _observer, _spreads, _index, _portrait, _left, _right, _center, _side, _zoom, _FixedLayout_instances, createFrame_fn, render_fn, showSpread_fn, goLeft_fn, goRight_fn, reportLocation_fn, FixedLayout;
  var init_fixed_layout = __esm({
    "src/libs/foliate-js/fixed-layout.ts"() {
      "use strict";
      init_adoptedStyleSheets();
      parseViewport = (str) => str?.split(/[,;\\s]/)?.filter((x3) => x3)?.map(
        (x3) => x3.split("=").map((x4) => x4.trim())
      );
      getViewport = (doc, viewport) => {
        if (doc.documentElement.localName === "svg") {
          const [, , width, height] = doc.documentElement.getAttribute("viewBox")?.split(/\\s/) ?? [];
          return {
            width: width ?? 1e3,
            height: height ?? 2e3
          };
        }
        const meta = parseViewport(
          doc.querySelector('meta[name="viewport"]')?.getAttribute("content") ?? void 0
        );
        if (meta) return Object.fromEntries(meta);
        if (typeof viewport === "string") {
          const parsed = parseViewport(viewport);
          if (parsed) return Object.fromEntries(parsed);
        }
        if (viewport && typeof viewport === "object") return viewport;
        const img = doc.querySelector("img");
        if (img)
          return {
            width: img.naturalWidth,
            height: img.naturalHeight
          };
        console.warn(new Error("Missing viewport properties"));
        return { width: 1e3, height: 2e3 };
      };
      FixedLayout = class extends HTMLElement {
        constructor() {
          super();
          __privateAdd(this, _FixedLayout_instances);
          __privateAdd(this, _root, this.attachShadow({ mode: "open" }));
          __privateAdd(this, _observer, new ResizeObserver(
            () => __privateMethod(this, _FixedLayout_instances, render_fn).call(this)
          ));
          __privateAdd(this, _spreads, []);
          __privateAdd(this, _index, -1);
          __publicField(this, "defaultViewport");
          __publicField(this, "spread");
          __privateAdd(this, _portrait, false);
          __privateAdd(this, _left, null);
          __privateAdd(this, _right, null);
          __privateAdd(this, _center, null);
          __privateAdd(this, _side);
          __privateAdd(this, _zoom);
          // Public fields
          __publicField(this, "book");
          __publicField(this, "rtl", false);
          const sheet = new CSSStyleSheet();
          __privateGet(this, _root).adoptedStyleSheets = [sheet];
          sheet.replaceSync(\`:host {
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: auto;
        }\`);
          __privateGet(this, _observer).observe(this);
        }
        attributeChangedCallback(name, _2, value) {
          switch (name) {
            case "zoom":
              __privateSet(this, _zoom, value !== "fit-width" && value !== "fit-page" ? parseFloat(value ?? "1") : value);
              __privateMethod(this, _FixedLayout_instances, render_fn).call(this);
              break;
          }
        }
        open(book) {
          this.book = book;
          const { rendition } = book;
          this.spread = rendition?.spread;
          this.defaultViewport = rendition?.viewport;
          const rtl = book.dir === "rtl";
          const ltr = !rtl;
          this.rtl = rtl;
          if (rendition?.spread === "none")
            __privateSet(this, _spreads, book.sections.map((section) => ({
              center: section
            })));
          else
            __privateSet(this, _spreads, book.sections.reduce(
              (arr, section, i3) => {
                const last = arr[arr.length - 1];
                const { pageSpread } = section;
                const newSpread = () => {
                  const spread = {};
                  arr.push(spread);
                  return spread;
                };
                if (pageSpread === "center") {
                  const spread = last.left || last.right ? newSpread() : last;
                  spread.center = section;
                } else if (pageSpread === "left") {
                  const spread = last.center || last.left || ltr && i3 ? newSpread() : last;
                  spread.left = section;
                } else if (pageSpread === "right") {
                  const spread = last.center || last.right || rtl && i3 ? newSpread() : last;
                  spread.right = section;
                } else if (ltr) {
                  if (last.center || last.right)
                    newSpread().left = section;
                  else if (last.left || !i3)
                    last.right = section;
                  else last.left = section;
                } else {
                  if (last.center || last.left)
                    newSpread().right = section;
                  else if (last.right || !i3)
                    last.left = section;
                  else last.right = section;
                }
                return arr;
              },
              [{}]
            ));
        }
        get index() {
          const spread = __privateGet(this, _spreads)[__privateGet(this, _index)];
          const section = spread?.center ?? (__privateGet(this, _side) === "left" ? spread.left ?? spread.right : spread.right ?? spread.left);
          return this.book.sections.indexOf(section);
        }
        getSpreadOf(section) {
          const spreads = __privateGet(this, _spreads);
          for (let index = 0; index < spreads.length; index++) {
            const { left, right, center } = spreads[index];
            if (left === section)
              return { index, side: "left" };
            if (right === section)
              return { index, side: "right" };
            if (center === section)
              return { index, side: "center" };
          }
        }
        async goToSpread(index, side, reason) {
          if (index < 0 || index > __privateGet(this, _spreads).length - 1)
            return;
          if (index === __privateGet(this, _index)) {
            __privateMethod(this, _FixedLayout_instances, render_fn).call(this, side);
            return;
          }
          __privateSet(this, _index, index);
          const spread = __privateGet(this, _spreads)[index];
          if (spread.center) {
            const idx = this.book.sections.indexOf(
              spread.center
            );
            const src = await spread.center?.load?.();
            await __privateMethod(this, _FixedLayout_instances, showSpread_fn).call(this, {
              center: { index: idx, src }
            });
          } else {
            const indexL = this.book.sections.indexOf(
              spread.left
            );
            const indexR = this.book.sections.indexOf(
              spread.right
            );
            const srcL = await spread.left?.load?.();
            const srcR = await spread.right?.load?.();
            const left = { index: indexL, src: srcL };
            const right = { index: indexR, src: srcR };
            await __privateMethod(this, _FixedLayout_instances, showSpread_fn).call(this, { left, right, side });
          }
          if (reason) __privateMethod(this, _FixedLayout_instances, reportLocation_fn).call(this, reason);
        }
        async select(target) {
          await this.goTo(target);
        }
        async goTo(target) {
          const { book } = this;
          const resolved = await target;
          const section = book.sections[resolved.index];
          if (!section) return;
          const result = this.getSpreadOf(section);
          if (result)
            await this.goToSpread(result.index, result.side);
        }
        async next() {
          const s3 = this.rtl ? __privateMethod(this, _FixedLayout_instances, goLeft_fn).call(this) : __privateMethod(this, _FixedLayout_instances, goRight_fn).call(this);
          if (s3) __privateMethod(this, _FixedLayout_instances, reportLocation_fn).call(this, "page");
          else
            return this.goToSpread(
              __privateGet(this, _index) + 1,
              this.rtl ? "right" : "left",
              "page"
            );
        }
        async prev() {
          const s3 = this.rtl ? __privateMethod(this, _FixedLayout_instances, goRight_fn).call(this) : __privateMethod(this, _FixedLayout_instances, goLeft_fn).call(this);
          if (s3) __privateMethod(this, _FixedLayout_instances, reportLocation_fn).call(this, "page");
          else
            return this.goToSpread(
              __privateGet(this, _index) - 1,
              this.rtl ? "left" : "right",
              "page"
            );
        }
        getContents() {
          return Array.from(
            __privateGet(this, _root).querySelectorAll("iframe"),
            (frame) => ({
              doc: frame.contentDocument
            })
          );
        }
        /** Return visible text from all loaded frames. */
        getVisibleText() {
          const texts = [];
          for (const frame of __privateGet(this, _root).querySelectorAll("iframe")) {
            const body = frame.contentDocument?.body;
            if (body) texts.push(body.innerText || body.textContent || "");
          }
          return texts.join("\\n").trim();
        }
        destroy() {
          __privateGet(this, _observer).unobserve(this);
        }
      };
      _root = new WeakMap();
      _observer = new WeakMap();
      _spreads = new WeakMap();
      _index = new WeakMap();
      _portrait = new WeakMap();
      _left = new WeakMap();
      _right = new WeakMap();
      _center = new WeakMap();
      _side = new WeakMap();
      _zoom = new WeakMap();
      _FixedLayout_instances = new WeakSet();
      createFrame_fn = async function({
        index,
        src: srcOption
      }) {
        const srcOptionIsString = typeof srcOption === "string";
        const src = srcOptionIsString ? srcOption : srcOption?.src;
        const onZoom = srcOptionIsString ? void 0 : srcOption?.onZoom;
        const element = document.createElement("div");
        const iframe = document.createElement("iframe");
        element.append(iframe);
        Object.assign(iframe.style, {
          border: "0",
          display: "none",
          overflow: "hidden"
        });
        iframe.setAttribute(
          "sandbox",
          "allow-same-origin allow-scripts"
        );
        iframe.setAttribute("scrolling", "no");
        iframe.setAttribute("part", "filter");
        __privateGet(this, _root).append(element);
        if (!src)
          return { blank: true, element, iframe };
        return new Promise((resolve) => {
          iframe.addEventListener(
            "load",
            () => {
              const doc = iframe.contentDocument;
              this.dispatchEvent(
                new CustomEvent("load", {
                  detail: { doc, index }
                })
              );
              const { width, height } = getViewport(
                doc,
                this.defaultViewport
              );
              resolve({
                element,
                iframe,
                width: parseFloat(String(width)),
                height: parseFloat(String(height)),
                onZoom
              });
            },
            { once: true }
          );
          iframe.src = src;
        });
      };
      render_fn = function(side = __privateGet(this, _side)) {
        if (!side) return;
        const left = __privateGet(this, _left) ?? {};
        const right = __privateGet(this, _center) ?? __privateGet(this, _right);
        const target = side === "left" ? left : right;
        const { width, height } = this.getBoundingClientRect();
        const portrait = this.spread !== "both" && this.spread !== "portrait" && height > width;
        __privateSet(this, _portrait, portrait);
        const blankWidth = left.width ?? right?.width ?? 0;
        const blankHeight = left.height ?? right?.height ?? 0;
        const scale = typeof __privateGet(this, _zoom) === "number" && !isNaN(__privateGet(this, _zoom)) ? __privateGet(this, _zoom) : __privateGet(this, _zoom) === "fit-width" ? portrait || __privateGet(this, _center) ? width / (target?.width ?? blankWidth) : width / ((left.width ?? blankWidth) + (right?.width ?? blankWidth)) : portrait || __privateGet(this, _center) ? Math.min(
          width / (target?.width ?? blankWidth),
          height / (target?.height ?? blankHeight)
        ) : Math.min(
          width / ((left.width ?? blankWidth) + (right?.width ?? blankWidth)),
          height / Math.max(
            left.height ?? blankHeight,
            right?.height ?? blankHeight
          )
        );
        const transform = (frame) => {
          const { element, iframe, width: width2, height: height2, blank, onZoom } = frame;
          if (onZoom)
            onZoom({
              doc: frame.iframe.contentDocument,
              scale
            });
          const iframeScale = onZoom ? scale : 1;
          Object.assign(iframe.style, {
            width: \`\${(width2 ?? 0) * iframeScale}px\`,
            height: \`\${(height2 ?? 0) * iframeScale}px\`,
            transform: onZoom ? "none" : \`scale(\${scale})\`,
            transformOrigin: "top left",
            display: blank ? "none" : "block"
          });
          Object.assign(element.style, {
            width: \`\${(width2 ?? blankWidth) * scale}px\`,
            height: \`\${(height2 ?? blankHeight) * scale}px\`,
            overflow: "hidden",
            display: "block",
            flexShrink: "0",
            marginBlock: "auto"
          });
          if (portrait && frame !== target) {
            element.style.display = "none";
          }
        };
        if (__privateGet(this, _center)) {
          transform(__privateGet(this, _center));
        } else {
          transform(left);
          if (right) transform(right);
        }
      };
      showSpread_fn = async function({
        left,
        right,
        center,
        side
      }) {
        __privateGet(this, _root).replaceChildren();
        __privateSet(this, _left, null);
        __privateSet(this, _right, null);
        __privateSet(this, _center, null);
        if (center) {
          __privateSet(this, _center, await __privateMethod(this, _FixedLayout_instances, createFrame_fn).call(this, center));
          __privateSet(this, _side, "center");
          __privateMethod(this, _FixedLayout_instances, render_fn).call(this);
        } else {
          __privateSet(this, _left, await __privateMethod(this, _FixedLayout_instances, createFrame_fn).call(this, left));
          __privateSet(this, _right, await __privateMethod(this, _FixedLayout_instances, createFrame_fn).call(this, right));
          __privateSet(this, _side, __privateGet(this, _left).blank ? "right" : __privateGet(this, _right).blank ? "left" : side);
          __privateMethod(this, _FixedLayout_instances, render_fn).call(this);
        }
      };
      goLeft_fn = function() {
        if (__privateGet(this, _center) || __privateGet(this, _left)?.blank) return;
        if (__privateGet(this, _portrait) && __privateGet(this, _left)?.element?.style?.display === "none") {
          __privateGet(this, _right).element.style.display = "none";
          __privateGet(this, _left).element.style.display = "block";
          __privateSet(this, _side, "left");
          return true;
        }
      };
      goRight_fn = function() {
        if (__privateGet(this, _center) || __privateGet(this, _right)?.blank) return;
        if (__privateGet(this, _portrait) && __privateGet(this, _right)?.element?.style?.display === "none") {
          __privateGet(this, _left).element.style.display = "none";
          __privateGet(this, _right).element.style.display = "block";
          __privateSet(this, _side, "right");
          return true;
        }
      };
      reportLocation_fn = function(reason) {
        this.dispatchEvent(
          new CustomEvent("relocate", {
            detail: {
              reason,
              range: null,
              index: this.index,
              fraction: 0,
              size: 1
            }
          })
        );
      };
      __publicField(FixedLayout, "observedAttributes", ["zoom"]);
      customElements.define("foliate-fxl", FixedLayout);
    }
  });

  // src/libs/foliate-js/page-curl.ts
  function parseColor(color) {
    let r3 = 245, g3 = 245, b3 = 240;
    if (color.startsWith("#")) {
      const hex = color.slice(1);
      if (hex.length === 3) {
        r3 = parseInt(hex[0] + hex[0], 16);
        g3 = parseInt(hex[1] + hex[1], 16);
        b3 = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length >= 6) {
        r3 = parseInt(hex.slice(0, 2), 16);
        g3 = parseInt(hex.slice(2, 4), 16);
        b3 = parseInt(hex.slice(4, 6), 16);
      }
    } else if (color.startsWith("rgb")) {
      const match = color.match(/(\\d+)/g);
      if (match && match.length >= 3) {
        r3 = parseInt(match[0]);
        g3 = parseInt(match[1]);
        b3 = parseInt(match[2]);
      }
    }
    return [r3, g3, b3];
  }
  function rgbStr(r3, g3, b3, a3 = 1) {
    return a3 < 1 ? \`rgba(\${Math.round(r3)},\${Math.round(g3)},\${Math.round(b3)},\${a3})\` : \`rgb(\${Math.round(r3)},\${Math.round(g3)},\${Math.round(b3)})\`;
  }
  function shade([r3, g3, b3], factor) {
    return rgbStr(r3 * factor, g3 * factor, b3 * factor);
  }
  function drawPageCurl(ctx, W2, H2, progress, direction, config = { pageColor: "#f5f5f0", rtl: false }) {
    ctx.clearRect(0, 0, W2, H2);
    if (!W2 || !H2 || !isFinite(W2) || !isFinite(H2)) return;
    const p3 = Math.min(1, Math.max(0, progress));
    if (p3 <= 2e-3) return;
    const flipX = direction === -1;
    if (flipX) {
      ctx.save();
      ctx.translate(W2, 0);
      ctx.scale(-1, 1);
    }
    drawCurlFromRight(ctx, W2, H2, p3, config);
    if (flipX) ctx.restore();
  }
  function drawCurlFromRight(ctx, W2, H2, p3, config) {
    const rgb = parseColor(config.pageColor);
    const foldX = W2 * (1 - p3);
    const maxBulge = Math.min(W2 * 0.06, 35);
    const bulge = maxBulge * Math.sin(p3 * Math.PI);
    const curlBackWidth = Math.min(W2 * p3 * 0.4, W2 * 0.2);
    const shadowWidth = Math.min(50, W2 * p3 * 0.2) + 4;
    if (shadowWidth > 2) {
      const shadowGrad = ctx.createLinearGradient(
        foldX - shadowWidth,
        0,
        foldX + 4,
        0
      );
      shadowGrad.addColorStop(0, "rgba(0,0,0,0)");
      shadowGrad.addColorStop(0.5, "rgba(0,0,0,0.04)");
      shadowGrad.addColorStop(0.85, "rgba(0,0,0,0.12)");
      shadowGrad.addColorStop(1, "rgba(0,0,0,0.22)");
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.moveTo(foldX - shadowWidth, 0);
      ctx.lineTo(foldX + 4, 0);
      ctx.quadraticCurveTo(foldX + 4 + bulge * 0.2, H2 / 2, foldX + 4, H2);
      ctx.lineTo(foldX - shadowWidth, H2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(foldX, 0);
    const cbRight = foldX + curlBackWidth;
    const cpBulge = foldX + curlBackWidth + bulge;
    ctx.bezierCurveTo(
      cpBulge,
      H2 * 0.12,
      cpBulge,
      H2 * 0.38,
      cbRight,
      H2 * 0.5
    );
    ctx.bezierCurveTo(
      cpBulge,
      H2 * 0.62,
      cpBulge,
      H2 * 0.88,
      foldX,
      H2
    );
    ctx.lineTo(foldX, H2);
    ctx.closePath();
    const backGrad = ctx.createLinearGradient(foldX, 0, cbRight, 0);
    backGrad.addColorStop(0, shade(rgb, 0.72));
    backGrad.addColorStop(0.04, shade(rgb, 0.85));
    backGrad.addColorStop(0.12, shade(rgb, 0.95));
    backGrad.addColorStop(0.5, shade(rgb, 0.98));
    backGrad.addColorStop(0.85, shade(rgb, 0.93));
    backGrad.addColorStop(1, shade(rgb, 0.85));
    ctx.fillStyle = backGrad;
    ctx.fill();
    ctx.restore();
    const hlWidth = Math.min(12, curlBackWidth * 0.3);
    if (hlWidth > 1) {
      const hlGrad = ctx.createLinearGradient(
        foldX - hlWidth * 0.5,
        0,
        foldX + hlWidth,
        0
      );
      hlGrad.addColorStop(0, "rgba(255,255,255,0)");
      hlGrad.addColorStop(0.3, "rgba(255,255,255,0.08)");
      hlGrad.addColorStop(0.5, "rgba(255,255,255,0.22)");
      hlGrad.addColorStop(0.7, "rgba(255,255,255,0.08)");
      hlGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = hlGrad;
      ctx.beginPath();
      ctx.moveTo(foldX - hlWidth * 0.5, 0);
      ctx.lineTo(foldX + hlWidth, 0);
      ctx.quadraticCurveTo(
        foldX + hlWidth + bulge * 0.15,
        H2 / 2,
        foldX + hlWidth,
        H2
      );
      ctx.lineTo(foldX - hlWidth * 0.5, H2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(foldX, 0);
    ctx.bezierCurveTo(
      cpBulge,
      H2 * 0.12,
      cpBulge,
      H2 * 0.38,
      cbRight,
      H2 * 0.5
    );
    ctx.bezierCurveTo(
      cpBulge,
      H2 * 0.62,
      cpBulge,
      H2 * 0.88,
      foldX,
      H2
    );
    ctx.lineTo(W2, H2);
    ctx.lineTo(W2, 0);
    ctx.closePath();
    const coverGrad = ctx.createLinearGradient(cbRight, 0, W2, 0);
    coverGrad.addColorStop(0, shade(rgb, 0.88));
    coverGrad.addColorStop(0.05, shade(rgb, 0.94));
    coverGrad.addColorStop(0.15, shade(rgb, 0.98));
    coverGrad.addColorStop(1, shade(rgb, 1));
    ctx.fillStyle = coverGrad;
    ctx.fill();
    const innerShadow = ctx.createLinearGradient(cbRight, 0, cbRight + 20, 0);
    innerShadow.addColorStop(0, "rgba(0,0,0,0.06)");
    innerShadow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = innerShadow;
    ctx.fill();
    ctx.restore();
  }
  function animateCurl(from, to, duration, onFrame) {
    let cancelled = false;
    let rafId = 0;
    const promise = new Promise((resolve) => {
      let start;
      const step = (now) => {
        if (cancelled) {
          resolve();
          return;
        }
        start ?? (start = now);
        const t3 = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t3, 3);
        const value = from + (to - from) * eased;
        onFrame(value);
        if (t3 < 1) rafId = requestAnimationFrame(step);
        else resolve();
      };
      rafId = requestAnimationFrame(step);
    });
    return {
      promise,
      cancel() {
        cancelled = true;
        cancelAnimationFrame(rafId);
      }
    };
  }
  var CURL_COMPLETE_THRESHOLD, CURL_VELOCITY_THRESHOLD, CURL_ANIMATE_DURATION;
  var init_page_curl = __esm({
    "src/libs/foliate-js/page-curl.ts"() {
      "use strict";
      CURL_COMPLETE_THRESHOLD = 0.25;
      CURL_VELOCITY_THRESHOLD = 0.3;
      CURL_ANIMATE_DURATION = 350;
    }
  });

  // src/libs/foliate-js/paginator.ts
  var paginator_exports = {};
  __export(paginator_exports, {
    Paginator: () => Paginator
  });
  var wait, debounce, lerp, easeOutQuad, animate, uncollapse, makeRange, bisectNode, SHOW_ELEMENT, SHOW_TEXT, SHOW_CDATA_SECTION, FILTER_ACCEPT, FILTER_REJECT, FILTER_SKIP, filter2, getBoundingClientRect, getVisibleRange, selectionIsBackward, setSelectionTo, getDirection, getBackground, makeMarginals, setStylesImportant, _observer2, _element, _iframe, _contentRange, _overlayer, _vertical, _rtl, _column, _size, _layout, View, _root2, _observer3, _top, _background, _container, _header, _footer, _view, _vertical2, _rtl2, _margin, _index2, _anchor, _justAnchored, _locked, _styles, _styleMap, _mediaQuery, _mediaQueryListener, _scrollBounds, _touchState, _touchScrolled, _lastVisibleRange, _curlCanvas, _curlCtx, _curlActive, _curlProgress, _curlDirection, _curlStartX, _curlAnim, _curlPageColor, _Paginator_instances, pageCurlEnabled_get, sizeCurlCanvas_fn, showCurlCanvas_fn, hideCurlCanvas_fn, drawCurl_fn, animatedPageCurl_fn, createView_fn, replaceBackground_fn, beforeRender_fn, onTouchStart_fn, onTouchMove_fn, onTouchEnd_fn, getRectMapper_fn, scrollToRect_fn, scrollTo_fn, scrollToPage_fn, scrollToAnchor_fn, getVisibleRange_fn, afterScroll_fn, display_fn, canGoToIndex_fn, goTo_fn, scrollPrev_fn, scrollNext_fn, adjacentIndex_fn, turnPage_fn, Paginator;
  var init_paginator = __esm({
    "src/libs/foliate-js/paginator.ts"() {
      "use strict";
      init_page_curl();
      wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      debounce = (f3, waitMs, immediate) => {
        let timeout;
        return (...args) => {
          const later = () => {
            timeout = null;
            if (!immediate) f3(...args);
          };
          const callNow = immediate && !timeout;
          if (timeout) clearTimeout(timeout);
          timeout = setTimeout(later, waitMs);
          if (callNow) f3(...args);
        };
      };
      lerp = (min, max, x3) => x3 * (max - min) + min;
      easeOutQuad = (x3) => 1 - (1 - x3) * (1 - x3);
      animate = (a3, b3, duration, ease, render) => new Promise((resolve) => {
        let start;
        const step = (now) => {
          start ?? (start = now);
          const fraction = Math.min(1, (now - start) / duration);
          render(lerp(a3, b3, ease(fraction)));
          if (fraction < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
      uncollapse = (range) => {
        if (range == null || typeof range === "number") return null;
        if ("collapsed" in range && !range.collapsed) return range;
        if (!("endOffset" in range)) return range;
        const { endOffset, endContainer } = range;
        if (endContainer.nodeType === 1) {
          const node = endContainer.childNodes[endOffset];
          if (node?.nodeType === 1) return node;
          return endContainer;
        }
        if (endOffset + 1 < endContainer.length)
          range.setEnd(endContainer, endOffset + 1);
        else if (endOffset > 1) range.setStart(endContainer, endOffset - 1);
        else return endContainer.parentNode;
        return range;
      };
      makeRange = (doc, node, start, end = start) => {
        const range = doc.createRange();
        range.setStart(node, start);
        range.setEnd(node, end);
        return range;
      };
      bisectNode = (doc, node, cb, start = 0, end = node.nodeValue.length) => {
        if (end - start === 1) {
          const result2 = cb(makeRange(doc, node, start), makeRange(doc, node, end));
          return result2 < 0 ? start : end;
        }
        const mid = Math.floor(start + (end - start) / 2);
        const result = cb(
          makeRange(doc, node, start, mid),
          makeRange(doc, node, mid, end)
        );
        return result < 0 ? bisectNode(doc, node, cb, start, mid) : result > 0 ? bisectNode(doc, node, cb, mid, end) : mid;
      };
      ({ SHOW_ELEMENT, SHOW_TEXT, SHOW_CDATA_SECTION, FILTER_ACCEPT, FILTER_REJECT, FILTER_SKIP } = NodeFilter);
      filter2 = SHOW_ELEMENT | SHOW_TEXT | SHOW_CDATA_SECTION;
      getBoundingClientRect = (target) => {
        const rects = target.getClientRects();
        let top = Infinity, right = -Infinity, left = Infinity, bottom = -Infinity;
        for (const rect of rects) {
          left = Math.min(left, rect.left);
          top = Math.min(top, rect.top);
          right = Math.max(right, rect.right);
          bottom = Math.max(bottom, rect.bottom);
        }
        return new DOMRect(left, top, right - left, bottom - top);
      };
      getVisibleRange = (doc, start, end, mapRect) => {
        const acceptNode2 = (node) => {
          const name = node.localName?.toLowerCase();
          if (name === "script" || name === "style") return FILTER_REJECT;
          if (node.nodeType === 1) {
            const { left, right } = mapRect(
              node.getBoundingClientRect()
            );
            if (right < start || left > end) return FILTER_REJECT;
            if (left >= start && right <= end) return FILTER_ACCEPT;
          } else {
            if (!node.nodeValue?.trim()) return FILTER_SKIP;
            const range2 = doc.createRange();
            range2.selectNodeContents(node);
            const { left, right } = mapRect(range2.getBoundingClientRect());
            if (right >= start && left <= end) return FILTER_ACCEPT;
          }
          return FILTER_SKIP;
        };
        const body = doc.body;
        if (!body) {
          const range2 = doc.createRange();
          range2.selectNodeContents(doc.documentElement ?? doc);
          return range2;
        }
        const walker = doc.createTreeWalker(body, filter2, { acceptNode: acceptNode2 });
        const nodes = [];
        for (let node = walker.nextNode(); node; node = walker.nextNode())
          nodes.push(node);
        const from = nodes[0] ?? body;
        const to = nodes[nodes.length - 1] ?? from;
        const startOffset = from.nodeType === 1 ? 0 : bisectNode(doc, from, (a3, b3) => {
          const p3 = mapRect(getBoundingClientRect(a3));
          const q2 = mapRect(getBoundingClientRect(b3));
          if (p3.right < start && q2.left > start) return 0;
          return q2.left > start ? -1 : 1;
        });
        const endOffset = to.nodeType === 1 ? 0 : bisectNode(doc, to, (a3, b3) => {
          const p3 = mapRect(getBoundingClientRect(a3));
          const q2 = mapRect(getBoundingClientRect(b3));
          if (p3.right < end && q2.left > end) return 0;
          return q2.left > end ? -1 : 1;
        });
        const range = doc.createRange();
        range.setStart(from, startOffset);
        range.setEnd(to, endOffset);
        return range;
      };
      selectionIsBackward = (sel) => {
        const range = document.createRange();
        range.setStart(sel.anchorNode, sel.anchorOffset);
        range.setEnd(sel.focusNode, sel.focusOffset);
        return range.collapsed;
      };
      setSelectionTo = (target, collapse2) => {
        if (target == null || typeof target === "number") return;
        let range;
        if ("startContainer" in target) range = target.cloneRange();
        else if ("nodeType" in target) {
          range = document.createRange();
          range.selectNode(target);
        }
        if (range) {
          const sel = range.startContainer.ownerDocument.defaultView.getSelection();
          sel.removeAllRanges();
          if (collapse2 === -1) range.collapse(true);
          else if (collapse2 === 1) range.collapse();
          sel.addRange(range);
        }
      };
      getDirection = (doc) => {
        const { defaultView } = doc;
        if (!defaultView || !doc.body) return { vertical: false, rtl: false };
        const { writingMode, direction } = defaultView.getComputedStyle(doc.body);
        const vertical = writingMode === "vertical-rl" || writingMode === "vertical-lr";
        const rtl = doc.body.dir === "rtl" || direction === "rtl" || doc.documentElement.dir === "rtl";
        return { vertical, rtl };
      };
      getBackground = (doc) => {
        if (!doc.defaultView || !doc.body) return "";
        const bodyStyle = doc.defaultView.getComputedStyle(doc.body);
        return bodyStyle.backgroundColor === "rgba(0, 0, 0, 0)" && bodyStyle.backgroundImage === "none" ? doc.defaultView.getComputedStyle(doc.documentElement).background : bodyStyle.background;
      };
      makeMarginals = (length, part) => Array.from({ length }, () => {
        const div = document.createElement("div");
        const child = document.createElement("div");
        div.append(child);
        child.setAttribute("part", part);
        return div;
      });
      setStylesImportant = (el, styles) => {
        const { style: style2 } = el;
        for (const [k3, v3] of Object.entries(styles))
          style2.setProperty(k3, v3, "important");
      };
      View = class {
        constructor({ container, onExpand }) {
          __privateAdd(this, _observer2, new ResizeObserver(() => {
            try {
              this.expand();
            } catch {
            }
          }));
          __privateAdd(this, _element, document.createElement("div"));
          __privateAdd(this, _iframe, document.createElement("iframe"));
          __privateAdd(this, _contentRange, document.createRange());
          __privateAdd(this, _overlayer);
          __privateAdd(this, _vertical, false);
          __privateAdd(this, _rtl, false);
          __privateAdd(this, _column, true);
          __privateAdd(this, _size, 0);
          __privateAdd(this, _layout, {});
          __publicField(this, "container");
          __publicField(this, "onExpand");
          __publicField(this, "docBackground", "");
          this.container = container;
          this.onExpand = onExpand;
          __privateGet(this, _iframe).setAttribute("part", "filter");
          __privateGet(this, _element).append(__privateGet(this, _iframe));
          Object.assign(__privateGet(this, _element).style, {
            boxSizing: "content-box",
            position: "relative",
            overflow: "hidden",
            flex: "0 0 auto",
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          });
          Object.assign(__privateGet(this, _iframe).style, {
            overflow: "hidden",
            border: "0",
            display: "none",
            width: "100%",
            height: "100%"
          });
          __privateGet(this, _iframe).setAttribute(
            "sandbox",
            "allow-same-origin allow-scripts"
          );
          __privateGet(this, _iframe).setAttribute("scrolling", "no");
        }
        get element() {
          return __privateGet(this, _element);
        }
        get document() {
          return __privateGet(this, _iframe).contentDocument;
        }
        async load(src, afterLoad, beforeRender) {
          if (typeof src !== "string") throw new Error(\`\${src} is not string\`);
          return new Promise((resolve) => {
            __privateGet(this, _iframe).addEventListener(
              "load",
              () => {
                const doc = this.document;
                if (!doc) {
                  resolve();
                  return;
                }
                try {
                  afterLoad?.(doc);
                  __privateGet(this, _iframe).style.display = "block";
                  const { vertical, rtl } = getDirection(doc);
                  this.docBackground = getBackground(doc);
                  if (doc.body) doc.body.style.background = "none";
                  const background = this.docBackground;
                  __privateGet(this, _iframe).style.display = "none";
                  __privateSet(this, _vertical, vertical);
                  __privateSet(this, _rtl, rtl);
                  if (doc.body) {
                    __privateGet(this, _contentRange).selectNodeContents(doc.body);
                  }
                  const layout = beforeRender?.({ vertical, rtl, background });
                  __privateGet(this, _iframe).style.display = "block";
                  this.render(layout);
                  if (doc.body) {
                    __privateGet(this, _observer2).observe(doc.body);
                  }
                  doc.fonts.ready.then(() => this.expand());
                } catch (e3) {
                  console.error("Error in iframe load handler:", e3);
                } finally {
                  resolve();
                }
              },
              { once: true }
            );
            __privateGet(this, _iframe).src = src;
          });
        }
        render(layout) {
          if (!layout || !this.document?.documentElement || !this.document?.body)
            return;
          __privateSet(this, _column, layout.flow !== "scrolled");
          __privateSet(this, _layout, layout);
          if (__privateGet(this, _column)) this.columnize(layout);
          else this.scrolled(layout);
        }
        scrolled({ margin, gap, columnWidth }) {
          const vertical = __privateGet(this, _vertical);
          const doc = this.document;
          if (!doc?.documentElement || !doc.body) return;
          setStylesImportant(doc.documentElement, {
            "box-sizing": "border-box",
            padding: vertical ? \`\${margin * 1.5}px \${gap}px\` : \`0 \${gap}px\`,
            "column-width": "auto",
            height: "auto",
            width: "auto"
          });
          setStylesImportant(doc.body, {
            [vertical ? "max-height" : "max-width"]: \`\${columnWidth}px\`,
            margin: "auto"
          });
          this.setImageSize();
          this.expand();
        }
        columnize({ width, height, margin, gap, columnWidth }) {
          const vertical = __privateGet(this, _vertical);
          __privateSet(this, _size, vertical ? height : width);
          const doc = this.document;
          if (!doc?.documentElement || !doc.body) return;
          setStylesImportant(doc.documentElement, {
            "box-sizing": "border-box",
            "column-width": \`\${Math.trunc(columnWidth)}px\`,
            "column-gap": vertical ? \`\${margin}px\` : \`\${gap}px\`,
            "column-fill": "auto",
            ...vertical ? { width: \`\${width}px\` } : { height: \`\${height}px\` },
            padding: vertical ? \`\${margin / 2}px \${gap}px\` : \`0 \${gap / 2}px\`,
            overflow: "hidden",
            "overflow-wrap": "break-word",
            position: "static",
            border: "0",
            margin: "0",
            "max-height": "none",
            "max-width": "none",
            "min-height": "none",
            "min-width": "none",
            "-webkit-line-box-contain": "block glyphs replaced"
          });
          setStylesImportant(doc.body, {
            "max-height": "none",
            "max-width": "none",
            margin: "0"
          });
          this.setImageSize();
          this.expand();
        }
        setImageSize() {
          const { width, height, margin } = __privateGet(this, _layout);
          if (!width || !height || margin == null) return;
          const vertical = __privateGet(this, _vertical);
          const doc = this.document;
          if (!doc?.body) return;
          for (const el of doc.body.querySelectorAll(
            "img, svg, video"
          )) {
            const { maxHeight, maxWidth } = doc.defaultView.getComputedStyle(el);
            setStylesImportant(el, {
              "max-height": vertical ? maxHeight !== "none" && maxHeight !== "0px" ? maxHeight : "100%" : \`\${height - margin * 2}px\`,
              "max-width": vertical ? \`\${width - margin * 2}px\` : maxWidth !== "none" && maxWidth !== "0px" ? maxWidth : "100%",
              "object-fit": "contain",
              "page-break-inside": "avoid",
              "break-inside": "avoid",
              "box-sizing": "border-box"
            });
          }
        }
        expand() {
          if (!this.document?.documentElement) return;
          const { documentElement } = this.document;
          if (__privateGet(this, _column)) {
            const side = __privateGet(this, _vertical) ? "height" : "width";
            const otherSide = __privateGet(this, _vertical) ? "width" : "height";
            const contentRect = __privateGet(this, _contentRange).getBoundingClientRect();
            const rootRect = documentElement.getBoundingClientRect();
            const contentStart = __privateGet(this, _vertical) ? 0 : __privateGet(this, _rtl) ? rootRect.right - contentRect.right : contentRect.left - rootRect.left;
            const contentSize = contentStart + contentRect[side];
            const pageCount = Math.ceil(contentSize / __privateGet(this, _size));
            const expandedSize = pageCount * __privateGet(this, _size);
            __privateGet(this, _element).style.padding = "0";
            __privateGet(this, _iframe).style[side] = \`\${expandedSize}px\`;
            __privateGet(this, _element).style[side] = \`\${expandedSize + __privateGet(this, _size) * 2}px\`;
            __privateGet(this, _iframe).style[otherSide] = "100%";
            __privateGet(this, _element).style[otherSide] = "100%";
            documentElement.style[side] = \`\${__privateGet(this, _size)}px\`;
            if (__privateGet(this, _overlayer)) {
              __privateGet(this, _overlayer).element.style.margin = "0";
              __privateGet(this, _overlayer).element.style.left = __privateGet(this, _vertical) ? "0" : \`\${__privateGet(this, _size)}px\`;
              __privateGet(this, _overlayer).element.style.top = __privateGet(this, _vertical) ? \`\${__privateGet(this, _size)}px\` : "0";
              __privateGet(this, _overlayer).element.style[side] = \`\${expandedSize}px\`;
              __privateGet(this, _overlayer).redraw();
            }
          } else {
            const side = __privateGet(this, _vertical) ? "width" : "height";
            const otherSide = __privateGet(this, _vertical) ? "height" : "width";
            const contentSize = documentElement.getBoundingClientRect()[side];
            const expandedSize = contentSize;
            const { margin, gap } = __privateGet(this, _layout);
            const padding = __privateGet(this, _vertical) ? \`0 \${gap}px\` : \`\${margin}px 0\`;
            __privateGet(this, _element).style.padding = padding;
            __privateGet(this, _iframe).style[side] = \`\${expandedSize}px\`;
            __privateGet(this, _element).style[side] = \`\${expandedSize}px\`;
            __privateGet(this, _iframe).style[otherSide] = "100%";
            __privateGet(this, _element).style[otherSide] = "100%";
            if (__privateGet(this, _overlayer)) {
              __privateGet(this, _overlayer).element.style.margin = padding;
              __privateGet(this, _overlayer).element.style.left = "0";
              __privateGet(this, _overlayer).element.style.top = "0";
              __privateGet(this, _overlayer).element.style[side] = \`\${expandedSize}px\`;
              __privateGet(this, _overlayer).redraw();
            }
          }
          this.onExpand();
        }
        set overlayer(overlayer) {
          __privateSet(this, _overlayer, overlayer);
          __privateGet(this, _element).append(overlayer.element);
        }
        get overlayer() {
          return __privateGet(this, _overlayer);
        }
        destroy() {
          try {
            const body = this.document?.body;
            if (body instanceof Element) __privateGet(this, _observer2).unobserve(body);
          } catch {
          }
        }
      };
      _observer2 = new WeakMap();
      _element = new WeakMap();
      _iframe = new WeakMap();
      _contentRange = new WeakMap();
      _overlayer = new WeakMap();
      _vertical = new WeakMap();
      _rtl = new WeakMap();
      _column = new WeakMap();
      _size = new WeakMap();
      _layout = new WeakMap();
      Paginator = class extends HTMLElement {
        constructor() {
          super();
          __privateAdd(this, _Paginator_instances);
          __privateAdd(this, _root2, this.attachShadow({ mode: "open" }));
          __privateAdd(this, _observer3, new ResizeObserver(() => {
            try {
              this.render();
            } catch {
            }
          }));
          __privateAdd(this, _top);
          __privateAdd(this, _background);
          __privateAdd(this, _container);
          __privateAdd(this, _header);
          __privateAdd(this, _footer);
          __privateAdd(this, _view, null);
          __privateAdd(this, _vertical2, false);
          __privateAdd(this, _rtl2, false);
          __privateAdd(this, _margin, 0);
          __privateAdd(this, _index2, -1);
          __privateAdd(this, _anchor, 0);
          // anchor view to a fraction (0-1), Range, or Element
          __privateAdd(this, _justAnchored, false);
          __privateAdd(this, _locked, false);
          // while true, prevent any further navigation
          __privateAdd(this, _styles);
          __privateAdd(this, _styleMap, /* @__PURE__ */ new WeakMap());
          __privateAdd(this, _mediaQuery, matchMedia("(prefers-color-scheme: dark)"));
          __privateAdd(this, _mediaQueryListener);
          __privateAdd(this, _scrollBounds);
          __privateAdd(this, _touchState, { x: 0, y: 0, t: 0, vx: 0, vy: 0 });
          __privateAdd(this, _touchScrolled, false);
          __privateAdd(this, _lastVisibleRange);
          // ── Page curl state ──
          __privateAdd(this, _curlCanvas);
          __privateAdd(this, _curlCtx, null);
          __privateAdd(this, _curlActive, false);
          __privateAdd(this, _curlProgress, 0);
          __privateAdd(this, _curlDirection, 1);
          __privateAdd(this, _curlStartX, 0);
          __privateAdd(this, _curlAnim, null);
          __privateAdd(this, _curlPageColor, "#f5f5f0");
          // Public fields set by open()
          __publicField(this, "bookDir");
          __publicField(this, "sections");
          __publicField(this, "heads", null);
          __publicField(this, "feet", null);
          __publicField(this, "columnCount", 1);
          __privateGet(this, _root2).innerHTML = \`<style>
        :host {
            display: block;
            container-type: size;
        }
        :host, #top {
            box-sizing: border-box;
            position: relative;
            overflow: hidden;
            width: 100%;
            height: 100%;
        }
        #top {
            --_gap: 7%;
            --_margin: 48px;
            --_margin-top: var(--_margin);
            --_margin-bottom: var(--_margin);
            --_max-inline-size: 720px;
            --_max-block-size: 1440px;
            --_max-column-count: 2;
            --_max-column-count-portrait: 1;
            --_max-column-count-spread: var(--_max-column-count);
            --_half-gap: calc(var(--_gap) / 2);
            --_max-width: calc(var(--_max-inline-size) * var(--_max-column-count-spread));
            --_max-height: var(--_max-block-size);
            display: grid;
            grid-template-columns:
                minmax(var(--_half-gap), 1fr)
                var(--_half-gap)
                minmax(0, calc(var(--_max-width) - var(--_gap)))
                var(--_half-gap)
                minmax(var(--_half-gap), 1fr);
            grid-template-rows:
                minmax(var(--_margin-top), 1fr)
                minmax(0, var(--_max-height))
                minmax(var(--_margin-bottom), 1fr);
            &.vertical {
                --_max-column-count-spread: var(--_max-column-count-portrait);
                --_max-width: var(--_max-block-size);
                --_max-height: calc(var(--_max-inline-size) * var(--_max-column-count-spread));
            }
            @container (orientation: portrait) {
                & {
                    --_max-column-count-spread: var(--_max-column-count-portrait);
                }
                &.vertical {
                    --_max-column-count-spread: var(--_max-column-count);
                }
            }
        }
        #background {
            grid-column: 1 / -1;
            grid-row: 1 / -1;
        }
        #container {
            grid-column: 2 / 5;
            grid-row: 2;
            overflow: hidden;
        }
        :host([flow="scrolled"]) #container {
            grid-column: 1 / -1;
            grid-row: 1 / -1;
            overflow: auto;
        }
        #header {
            grid-column: 3 / 4;
            grid-row: 1;
        }
        #footer {
            grid-column: 3 / 4;
            grid-row: 3;
            align-self: end;
        }
        #header {
            display: grid;
            height: var(--_margin-top);
        }
        #footer {
            display: grid;
            height: var(--_margin-bottom);
        }
        :is(#header, #footer) > * {
            display: flex;
            align-items: center;
            min-width: 0;
        }
        :is(#header, #footer) > * > * {
            width: 100%;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            text-align: center;
            font-size: .75em;
            opacity: .6;
        }
        #curl-canvas {
            grid-column: 1 / -1;
            grid-row: 1 / -1;
            z-index: 10;
            pointer-events: none;
            display: none;
            width: 100%;
            height: 100%;
        }
        </style>
        <div id="top">
            <div id="background" part="filter"></div>
            <div id="header"></div>
            <div id="container" part="container"></div>
            <div id="footer"></div>
            <canvas id="curl-canvas"></canvas>
        </div>
        \`;
          __privateSet(this, _top, __privateGet(this, _root2).getElementById("top"));
          __privateSet(this, _background, __privateGet(this, _root2).getElementById("background"));
          __privateSet(this, _container, __privateGet(this, _root2).getElementById("container"));
          __privateSet(this, _header, __privateGet(this, _root2).getElementById("header"));
          __privateSet(this, _footer, __privateGet(this, _root2).getElementById("footer"));
          __privateSet(this, _curlCanvas, __privateGet(this, _root2).getElementById("curl-canvas"));
          __privateSet(this, _curlCtx, __privateGet(this, _curlCanvas).getContext("2d"));
          __privateGet(this, _observer3).observe(__privateGet(this, _container));
          __privateGet(this, _container).addEventListener(
            "scroll",
            () => this.dispatchEvent(new Event("scroll"))
          );
          __privateGet(this, _container).addEventListener(
            "scroll",
            debounce(() => {
              if (this.scrolled) {
                if (__privateGet(this, _justAnchored)) __privateSet(this, _justAnchored, false);
                else __privateMethod(this, _Paginator_instances, afterScroll_fn).call(this, "scroll");
              }
            }, 250)
          );
          const opts = { passive: false };
          this.addEventListener(
            "touchstart",
            __privateMethod(this, _Paginator_instances, onTouchStart_fn).bind(this),
            opts
          );
          this.addEventListener(
            "touchmove",
            __privateMethod(this, _Paginator_instances, onTouchMove_fn).bind(this),
            opts
          );
          this.addEventListener(
            "touchend",
            __privateMethod(this, _Paginator_instances, onTouchEnd_fn).bind(this)
          );
          this.addEventListener("load", (e3) => {
            const { doc } = e3.detail;
            doc.addEventListener(
              "touchstart",
              __privateMethod(this, _Paginator_instances, onTouchStart_fn).bind(this),
              opts
            );
            doc.addEventListener(
              "touchmove",
              __privateMethod(this, _Paginator_instances, onTouchMove_fn).bind(this),
              opts
            );
            doc.addEventListener(
              "touchend",
              __privateMethod(this, _Paginator_instances, onTouchEnd_fn).bind(this)
            );
          });
          this.addEventListener("relocate", (e3) => {
            const detail = e3.detail;
            if (detail.reason === "selection")
              setSelectionTo(__privateGet(this, _anchor), 0);
            else if (detail.reason === "navigation") {
              if (__privateGet(this, _anchor) === 1) setSelectionTo(detail.range, 1);
              else if (typeof __privateGet(this, _anchor) === "number")
                setSelectionTo(detail.range, -1);
              else setSelectionTo(__privateGet(this, _anchor), -1);
            }
          });
          const checkPointerSelection = debounce(
            (range, sel) => {
              if (!sel.rangeCount) return;
              if ("ontouchstart" in globalThis) return;
              const selRange = sel.getRangeAt(0);
              const backward = selectionIsBackward(sel);
              if (backward && selRange.compareBoundaryPoints(
                Range.START_TO_START,
                range
              ) < 0)
                this.prev();
              else if (!backward && selRange.compareBoundaryPoints(Range.END_TO_END, range) > 0)
                this.next();
            },
            700
          );
          this.addEventListener("load", (e3) => {
            const { doc } = e3.detail;
            let isPointerSelecting = false;
            doc.addEventListener(
              "pointerdown",
              () => isPointerSelecting = true
            );
            doc.addEventListener(
              "pointerup",
              () => isPointerSelecting = false
            );
            let isKeyboardSelecting = false;
            doc.addEventListener(
              "keydown",
              () => isKeyboardSelecting = true
            );
            doc.addEventListener(
              "keyup",
              () => isKeyboardSelecting = false
            );
            doc.addEventListener("selectionchange", () => {
              if (this.scrolled) return;
              const range = __privateGet(this, _lastVisibleRange);
              if (!range) return;
              const sel = doc.getSelection();
              if (!sel?.rangeCount) return;
              if (isPointerSelecting && sel.type === "Range")
                checkPointerSelection(range, sel);
              else if (isKeyboardSelecting) {
                const selRange = sel.getRangeAt(0).cloneRange();
                const backward = selectionIsBackward(sel);
                if (!backward) selRange.collapse();
                __privateMethod(this, _Paginator_instances, scrollToAnchor_fn).call(this, selRange);
              }
            });
            doc.addEventListener(
              "focusin",
              (e4) => this.scrolled ? null : requestAnimationFrame(
                () => __privateMethod(this, _Paginator_instances, scrollToAnchor_fn).call(this, e4.target)
              )
            );
          });
          __privateSet(this, _mediaQueryListener, () => {
            if (!__privateGet(this, _view)) return;
            __privateMethod(this, _Paginator_instances, replaceBackground_fn).call(this, __privateGet(this, _view).docBackground, this.columnCount);
          });
          __privateGet(this, _mediaQuery).addEventListener("change", __privateGet(this, _mediaQueryListener));
        }
        /** Set the page color used for the curl back-of-page gradient. */
        setPageCurlColor(color) {
          __privateSet(this, _curlPageColor, color);
        }
        attributeChangedCallback(name, _2, value) {
          switch (name) {
            case "flow":
              this.render();
              break;
            case "gap":
            case "margin":
            case "margin-top":
            case "margin-bottom":
            case "max-block-size":
            case "max-column-count":
              __privateGet(this, _top).style.setProperty("--_" + name, value);
              this.render();
              break;
            case "max-inline-size":
              __privateGet(this, _top).style.setProperty("--_" + name, value);
              this.render();
              break;
          }
        }
        open(book) {
          this.bookDir = book.dir;
          this.sections = book.sections;
          book.transformTarget?.addEventListener("data", (e3) => {
            const detail = e3.detail;
            if (detail.type !== "text/css") return;
            const w2 = innerWidth;
            const h3 = innerHeight;
            detail.data = Promise.resolve(detail.data).then(
              (data) => data.replace(/(?<=[{\\s;])-epub-/gi, "").replace(
                /(\\d*\\.?\\d+)vw/gi,
                (_2, d2) => parseFloat(d2) * w2 / 100 + "px"
              ).replace(
                /(\\d*\\.?\\d+)vh/gi,
                (_2, d2) => parseFloat(d2) * h3 / 100 + "px"
              ).replace(
                /page-break-(after|before|inside)\\s*:/gi,
                (_2, x3) => \`-webkit-column-break-\${x3}:\`
              ).replace(
                /break-(after|before|inside)\\s*:\\s*(avoid-)?page/gi,
                (_2, x3, y3) => \`break-\${x3}: \${y3 ?? ""}column\`
              )
            );
          });
        }
        render() {
          if (!__privateGet(this, _view)) return;
          __privateGet(this, _view).render(
            __privateMethod(this, _Paginator_instances, beforeRender_fn).call(this, {
              vertical: __privateGet(this, _vertical2),
              rtl: __privateGet(this, _rtl2),
              background: ""
            })
          );
          __privateMethod(this, _Paginator_instances, scrollToAnchor_fn).call(this, __privateGet(this, _anchor));
        }
        get scrolled() {
          return this.getAttribute("flow") === "scrolled";
        }
        get scrollProp() {
          const { scrolled } = this;
          return __privateGet(this, _vertical2) ? scrolled ? "scrollLeft" : "scrollTop" : scrolled ? "scrollTop" : "scrollLeft";
        }
        get sideProp() {
          const { scrolled } = this;
          return __privateGet(this, _vertical2) ? scrolled ? "width" : "height" : scrolled ? "height" : "width";
        }
        get size() {
          return __privateGet(this, _container).getBoundingClientRect()[this.sideProp];
        }
        get viewSize() {
          return __privateGet(this, _view).element.getBoundingClientRect()[this.sideProp];
        }
        get start() {
          return Math.abs(__privateGet(this, _container)[this.scrollProp]);
        }
        get end() {
          return this.start + this.size;
        }
        get page() {
          return Math.floor((this.start + this.end) / 2 / this.size);
        }
        get pages() {
          return Math.round(this.viewSize / this.size);
        }
        get containerPosition() {
          return __privateGet(this, _container)[this.scrollProp];
        }
        set containerPosition(newVal) {
          __privateGet(this, _container)[this.scrollProp] = newVal;
        }
        // Named differently from HTMLElement.scrollBy to avoid signature conflict
        doScrollBy(dx, dy) {
          if (!__privateGet(this, _scrollBounds)) return;
          const delta = __privateGet(this, _vertical2) ? dy : dx;
          const [offset, a3, b3] = __privateGet(this, _scrollBounds);
          const rtl = __privateGet(this, _rtl2);
          const min = rtl ? offset - b3 : offset - a3;
          const max = rtl ? offset + a3 : offset + b3;
          this.containerPosition = Math.max(
            min,
            Math.min(max, this.containerPosition + delta)
          );
        }
        snap(vx, vy) {
          if (!__privateGet(this, _scrollBounds)) return;
          if (__privateGet(this, _locked)) return;
          const velocity = __privateGet(this, _vertical2) ? vy : vx;
          const [offset, a3, b3] = __privateGet(this, _scrollBounds);
          const { start, end, pages, size } = this;
          const min = Math.abs(offset) - a3;
          const max = Math.abs(offset) + b3;
          const d2 = velocity * (__privateGet(this, _rtl2) ? -size : size);
          const page = Math.floor(
            Math.max(
              min,
              Math.min(
                max,
                (start + end) / 2 + (isNaN(d2) ? 0 : d2)
              )
            ) / size
          );
          __privateSet(this, _locked, true);
          __privateMethod(this, _Paginator_instances, scrollToPage_fn).call(this, page, "snap").then(() => {
            const dir = page <= 0 ? -1 : page >= pages - 1 ? 1 : null;
            if (dir)
              return __privateMethod(this, _Paginator_instances, goTo_fn).call(this, {
                index: __privateMethod(this, _Paginator_instances, adjacentIndex_fn).call(this, dir),
                anchor: dir < 0 ? () => 1 : () => 0
              });
          }).finally(() => {
            __privateSet(this, _locked, false);
          });
        }
        async scrollToAnchor(anchor, select) {
          return __privateMethod(this, _Paginator_instances, scrollToAnchor_fn).call(this, anchor, select ? "selection" : "navigation");
        }
        async goTo(target) {
          __privateSet(this, _locked, false);
          const resolved = await target;
          if (resolved && __privateMethod(this, _Paginator_instances, canGoToIndex_fn).call(this, resolved.index))
            return __privateMethod(this, _Paginator_instances, goTo_fn).call(this, resolved);
        }
        get atStart() {
          return __privateMethod(this, _Paginator_instances, adjacentIndex_fn).call(this, -1) == null && this.page <= 1;
        }
        get atEnd() {
          return __privateMethod(this, _Paginator_instances, adjacentIndex_fn).call(this, 1) == null && this.page >= this.pages - 2;
        }
        async prev(distance) {
          return await __privateMethod(this, _Paginator_instances, turnPage_fn).call(this, -1, distance);
        }
        async next(distance) {
          return await __privateMethod(this, _Paginator_instances, turnPage_fn).call(this, 1, distance);
        }
        prevSection() {
          const index = __privateMethod(this, _Paginator_instances, adjacentIndex_fn).call(this, -1);
          if (index != null) return this.goTo({ index });
        }
        nextSection() {
          const index = __privateMethod(this, _Paginator_instances, adjacentIndex_fn).call(this, 1);
          if (index != null) return this.goTo({ index });
        }
        firstSection() {
          const index = this.sections.findIndex(
            (section) => section.linear !== "no"
          );
          return this.goTo({ index });
        }
        lastSection() {
          const index = this.sections.findLastIndex(
            (section) => section.linear !== "no"
          );
          return this.goTo({ index });
        }
        getContents() {
          if (__privateGet(this, _view))
            return [
              {
                index: __privateGet(this, _index2),
                overlayer: __privateGet(this, _view).overlayer,
                doc: __privateGet(this, _view).document
              }
            ];
          return [];
        }
        /** Return only the text that is visible on the current page/column. */
        getVisibleText() {
          if (!__privateGet(this, _view)?.document) return "";
          try {
            const range = __privateMethod(this, _Paginator_instances, getVisibleRange_fn).call(this);
            return range.toString();
          } catch {
            return "";
          }
        }
        /** Return a Range representing the visible text on the current page. */
        getVisibleRange() {
          if (!__privateGet(this, _view)?.document) return null;
          try {
            return __privateMethod(this, _Paginator_instances, getVisibleRange_fn).call(this);
          } catch {
            return null;
          }
        }
        setStyles(styles) {
          __privateSet(this, _styles, styles);
          const $$styles = __privateGet(this, _styleMap).get(__privateGet(this, _view)?.document);
          if (!$$styles) return;
          const [$beforeStyle, $style] = $$styles;
          if (Array.isArray(styles)) {
            const [beforeStyle, style2] = styles;
            $beforeStyle.textContent = beforeStyle;
            $style.textContent = style2;
          } else $style.textContent = styles ?? "";
          requestAnimationFrame(() => {
            __privateMethod(this, _Paginator_instances, replaceBackground_fn).call(this, __privateGet(this, _view).docBackground, this.columnCount);
          });
          __privateGet(this, _view)?.document?.fonts?.ready?.then(
            () => __privateGet(this, _view)?.expand()
          );
        }
        focusView() {
          __privateGet(this, _view)?.document?.defaultView?.focus();
        }
        destroy() {
          try {
            __privateGet(this, _observer3).unobserve(this);
          } catch {
          }
          try {
            __privateGet(this, _view)?.destroy();
          } catch {
          }
          __privateSet(this, _view, null);
          this.sections[__privateGet(this, _index2)]?.unload?.();
          __privateGet(this, _mediaQuery).removeEventListener(
            "change",
            __privateGet(this, _mediaQueryListener)
          );
        }
      };
      _root2 = new WeakMap();
      _observer3 = new WeakMap();
      _top = new WeakMap();
      _background = new WeakMap();
      _container = new WeakMap();
      _header = new WeakMap();
      _footer = new WeakMap();
      _view = new WeakMap();
      _vertical2 = new WeakMap();
      _rtl2 = new WeakMap();
      _margin = new WeakMap();
      _index2 = new WeakMap();
      _anchor = new WeakMap();
      _justAnchored = new WeakMap();
      _locked = new WeakMap();
      _styles = new WeakMap();
      _styleMap = new WeakMap();
      _mediaQuery = new WeakMap();
      _mediaQueryListener = new WeakMap();
      _scrollBounds = new WeakMap();
      _touchState = new WeakMap();
      _touchScrolled = new WeakMap();
      _lastVisibleRange = new WeakMap();
      _curlCanvas = new WeakMap();
      _curlCtx = new WeakMap();
      _curlActive = new WeakMap();
      _curlProgress = new WeakMap();
      _curlDirection = new WeakMap();
      _curlStartX = new WeakMap();
      _curlAnim = new WeakMap();
      _curlPageColor = new WeakMap();
      _Paginator_instances = new WeakSet();
      pageCurlEnabled_get = function() {
        return this.hasAttribute("page-curl") && !this.scrolled;
      };
      sizeCurlCanvas_fn = function() {
        const rect = __privateGet(this, _top).getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const dpr = devicePixelRatio || 1;
        __privateGet(this, _curlCanvas).width = Math.round(rect.width * dpr);
        __privateGet(this, _curlCanvas).height = Math.round(rect.height * dpr);
        __privateGet(this, _curlCanvas).style.width = \`\${rect.width}px\`;
        __privateGet(this, _curlCanvas).style.height = \`\${rect.height}px\`;
        __privateSet(this, _curlCtx, __privateGet(this, _curlCanvas).getContext("2d"));
        __privateGet(this, _curlCtx)?.scale(dpr, dpr);
      };
      showCurlCanvas_fn = function() {
        __privateGet(this, _curlCanvas).style.display = "block";
        __privateMethod(this, _Paginator_instances, sizeCurlCanvas_fn).call(this);
      };
      hideCurlCanvas_fn = function() {
        __privateGet(this, _curlCanvas).style.display = "none";
        __privateSet(this, _curlProgress, 0);
        __privateSet(this, _curlActive, false);
        if (__privateGet(this, _curlCtx)) {
          const dpr = devicePixelRatio || 1;
          __privateGet(this, _curlCtx).setTransform(1, 0, 0, 1, 0, 0);
          __privateGet(this, _curlCtx).clearRect(0, 0, __privateGet(this, _curlCanvas).width, __privateGet(this, _curlCanvas).height);
          __privateGet(this, _curlCtx).scale(dpr, dpr);
        }
      };
      drawCurl_fn = function() {
        if (!__privateGet(this, _curlCtx)) return;
        const rect = __privateGet(this, _top).getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const dpr = devicePixelRatio || 1;
        __privateGet(this, _curlCtx).setTransform(1, 0, 0, 1, 0, 0);
        __privateGet(this, _curlCtx).scale(dpr, dpr);
        drawPageCurl(
          __privateGet(this, _curlCtx),
          rect.width,
          rect.height,
          __privateGet(this, _curlProgress),
          __privateGet(this, _curlDirection),
          { pageColor: __privateGet(this, _curlPageColor), rtl: __privateGet(this, _rtl2) }
        );
      };
      animatedPageCurl_fn = async function(dir) {
        __privateGet(this, _curlAnim)?.cancel();
        const prev = dir === -1;
        if (prev && this.atStart) return;
        if (!prev && this.atEnd) return;
        __privateSet(this, _curlDirection, dir);
        __privateMethod(this, _Paginator_instances, showCurlCanvas_fn).call(this);
        const anim = animateCurl(0, 1, CURL_ANIMATE_DURATION, (p3) => {
          __privateSet(this, _curlProgress, p3);
          __privateMethod(this, _Paginator_instances, drawCurl_fn).call(this);
        });
        __privateSet(this, _curlAnim, anim);
        await anim.promise;
        __privateSet(this, _curlAnim, null);
        const wasAnimated = this.hasAttribute("animated");
        if (wasAnimated) this.removeAttribute("animated");
        const shouldGo = await (prev ? __privateMethod(this, _Paginator_instances, scrollPrev_fn).call(this) : __privateMethod(this, _Paginator_instances, scrollNext_fn).call(this));
        if (shouldGo)
          await __privateMethod(this, _Paginator_instances, goTo_fn).call(this, {
            index: __privateMethod(this, _Paginator_instances, adjacentIndex_fn).call(this, dir),
            anchor: prev ? () => 1 : () => 0
          });
        if (wasAnimated) this.setAttribute("animated", "");
        await new Promise((r3) => requestAnimationFrame(r3));
        __privateMethod(this, _Paginator_instances, hideCurlCanvas_fn).call(this);
      };
      createView_fn = function() {
        if (__privateGet(this, _view)) {
          __privateGet(this, _view).destroy();
          __privateGet(this, _container).removeChild(__privateGet(this, _view).element);
        }
        __privateSet(this, _view, new View({
          container: this,
          onExpand: () => __privateMethod(this, _Paginator_instances, scrollToAnchor_fn).call(this, __privateGet(this, _anchor))
        }));
        __privateGet(this, _container).append(__privateGet(this, _view).element);
        return __privateGet(this, _view);
      };
      replaceBackground_fn = function(background, columnCount) {
        const doc = __privateGet(this, _view)?.document;
        if (!doc) return;
        const htmlStyle = doc.defaultView?.getComputedStyle(doc.documentElement);
        if (!htmlStyle) return;
        const themeBgColor = htmlStyle.getPropertyValue("--theme-bg-color");
        if (background && themeBgColor) {
          const parsedBackground = background.split(
            /\\s(?=(?:url|rgb|hsl|#[0-9a-fA-F]{3,6}))/
          );
          parsedBackground[0] = themeBgColor;
          background = parsedBackground.join(" ");
        }
        if (/cover.*fixed|fixed.*cover/.test(background)) {
          background = background.replace("cover", "auto 100%").replace("fixed", "");
        }
        __privateGet(this, _background).innerHTML = "";
        __privateGet(this, _background).style.display = "grid";
        __privateGet(this, _background).style.gridTemplateColumns = \`repeat(\${columnCount}, 1fr)\`;
        for (let i3 = 0; i3 < columnCount; i3++) {
          const column = document.createElement("div");
          column.style.background = background;
          column.style.width = "100%";
          column.style.height = "100%";
          __privateGet(this, _background).appendChild(column);
        }
      };
      beforeRender_fn = function({ vertical, rtl, background }) {
        __privateSet(this, _vertical2, vertical);
        __privateSet(this, _rtl2, rtl);
        __privateGet(this, _top).classList.toggle("vertical", vertical);
        const { width, height } = __privateGet(this, _container).getBoundingClientRect();
        const size = vertical ? height : width;
        const style2 = getComputedStyle(__privateGet(this, _top));
        const maxInlineSize = parseFloat(
          style2.getPropertyValue("--_max-inline-size")
        );
        const maxColumnCount = parseInt(
          style2.getPropertyValue("--_max-column-count-spread")
        );
        const margin = parseFloat(style2.getPropertyValue("--_margin"));
        __privateSet(this, _margin, margin);
        const g3 = parseFloat(style2.getPropertyValue("--_gap")) / 100;
        const gap = -g3 / (g3 - 1) * size;
        const flow = this.getAttribute("flow");
        if (flow === "scrolled") {
          this.setAttribute("dir", vertical ? "rtl" : "ltr");
          __privateGet(this, _top).style.padding = "0";
          const columnWidth2 = maxInlineSize;
          this.heads = null;
          this.feet = null;
          __privateGet(this, _header).replaceChildren();
          __privateGet(this, _footer).replaceChildren();
          return { flow, margin, gap, columnWidth: columnWidth2 };
        }
        const divisor = Math.min(
          maxColumnCount,
          Math.ceil(size / maxInlineSize)
        );
        const columnWidth = vertical ? size / divisor - margin : size / divisor - gap;
        this.setAttribute("dir", rtl ? "rtl" : "ltr");
        this.columnCount = divisor;
        __privateMethod(this, _Paginator_instances, replaceBackground_fn).call(this, background, this.columnCount);
        const marginalDivisor = vertical ? Math.min(2, Math.ceil(width / maxInlineSize)) : divisor;
        const marginalStyle = {
          gridTemplateColumns: \`repeat(\${marginalDivisor}, 1fr)\`,
          gap: \`\${gap}px\`,
          direction: this.bookDir === "rtl" ? "rtl" : "ltr"
        };
        Object.assign(__privateGet(this, _header).style, marginalStyle);
        Object.assign(__privateGet(this, _footer).style, marginalStyle);
        const heads = makeMarginals(marginalDivisor, "head");
        const feet = makeMarginals(marginalDivisor, "foot");
        this.heads = heads.map((el) => el.children[0]);
        this.feet = feet.map((el) => el.children[0]);
        __privateGet(this, _header).replaceChildren(...heads);
        __privateGet(this, _footer).replaceChildren(...feet);
        return { height, width, margin, gap, columnWidth };
      };
      onTouchStart_fn = function(e3) {
        const touch = e3.changedTouches[0];
        __privateSet(this, _touchState, {
          x: touch?.screenX,
          y: touch?.screenY,
          t: e3.timeStamp,
          vx: 0,
          vy: 0
        });
        if (__privateGet(this, _Paginator_instances, pageCurlEnabled_get)) {
          __privateSet(this, _curlStartX, touch?.screenX ?? 0);
          __privateGet(this, _curlAnim)?.cancel();
          __privateSet(this, _curlAnim, null);
        }
      };
      onTouchMove_fn = function(e3) {
        const state = __privateGet(this, _touchState);
        if (state.pinched) return;
        state.pinched = globalThis.visualViewport.scale > 1;
        if (this.scrolled || state.pinched) return;
        if (e3.touches.length > 1) {
          if (__privateGet(this, _touchScrolled)) e3.preventDefault();
          return;
        }
        const doc = __privateGet(this, _view)?.document;
        const selection = doc?.getSelection();
        if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
          return;
        }
        e3.preventDefault();
        const touch = e3.changedTouches[0];
        const x3 = touch.screenX, y3 = touch.screenY;
        const dx = state.x - x3, dy = state.y - y3;
        const dt2 = e3.timeStamp - state.t;
        state.x = x3;
        state.y = y3;
        state.t = e3.timeStamp;
        state.vx = dx / dt2;
        state.vy = dy / dt2;
        __privateSet(this, _touchScrolled, true);
        if (__privateGet(this, _Paginator_instances, pageCurlEnabled_get)) {
          const totalDx = __privateGet(this, _curlStartX) - x3;
          const absTotalDx = Math.abs(totalDx);
          if (absTotalDx > 15) {
            const containerWidth = __privateGet(this, _container).getBoundingClientRect().width;
            if (!__privateGet(this, _curlActive)) {
              __privateSet(this, _curlActive, true);
              __privateSet(this, _curlDirection, totalDx > 0 ? 1 : -1);
              __privateMethod(this, _Paginator_instances, showCurlCanvas_fn).call(this);
            }
            __privateSet(this, _curlProgress, Math.min(1, absTotalDx / containerWidth));
            __privateMethod(this, _Paginator_instances, drawCurl_fn).call(this);
          }
          return;
        }
        if (Math.abs(dx) >= Math.abs(dy)) {
          this.doScrollBy(dx, 0);
        } else if (Math.abs(dy) > Math.abs(dx)) {
          this.doScrollBy(0, dy);
        }
      };
      onTouchEnd_fn = function() {
        __privateSet(this, _touchScrolled, false);
        if (this.scrolled) return;
        if (__privateGet(this, _Paginator_instances, pageCurlEnabled_get) && __privateGet(this, _curlActive)) {
          const progress = __privateGet(this, _curlProgress);
          const velocity = Math.abs(__privateGet(this, _touchState).vx);
          const shouldComplete = progress > CURL_COMPLETE_THRESHOLD || velocity > CURL_VELOCITY_THRESHOLD;
          if (shouldComplete) {
            const dir = __privateGet(this, _curlDirection);
            const anim = animateCurl(
              progress,
              1,
              CURL_ANIMATE_DURATION * (1 - progress),
              (p3) => {
                __privateSet(this, _curlProgress, p3);
                __privateMethod(this, _Paginator_instances, drawCurl_fn).call(this);
              }
            );
            __privateSet(this, _curlAnim, anim);
            anim.promise.then(async () => {
              __privateSet(this, _curlAnim, null);
              const prev = dir === -1;
              const shouldGo = await (prev ? __privateMethod(this, _Paginator_instances, scrollPrev_fn).call(this) : __privateMethod(this, _Paginator_instances, scrollNext_fn).call(this));
              if (shouldGo)
                await __privateMethod(this, _Paginator_instances, goTo_fn).call(this, {
                  index: __privateMethod(this, _Paginator_instances, adjacentIndex_fn).call(this, dir),
                  anchor: prev ? () => 1 : () => 0
                });
              await new Promise((r3) => requestAnimationFrame(r3));
              __privateMethod(this, _Paginator_instances, hideCurlCanvas_fn).call(this);
            });
          } else {
            const anim = animateCurl(
              progress,
              0,
              CURL_ANIMATE_DURATION * progress,
              (p3) => {
                __privateSet(this, _curlProgress, p3);
                __privateMethod(this, _Paginator_instances, drawCurl_fn).call(this);
              }
            );
            __privateSet(this, _curlAnim, anim);
            anim.promise.then(() => {
              __privateSet(this, _curlAnim, null);
              __privateMethod(this, _Paginator_instances, hideCurlCanvas_fn).call(this);
            });
          }
          return;
        }
        requestAnimationFrame(() => {
          if (globalThis.visualViewport.scale === 1)
            this.snap(__privateGet(this, _touchState).vx, __privateGet(this, _touchState).vy);
        });
      };
      // allows one to process rects as if they were LTR and horizontal
      getRectMapper_fn = function() {
        if (this.scrolled) {
          const size = this.viewSize;
          const margin = __privateGet(this, _margin);
          return __privateGet(this, _vertical2) ? ({ left, right }) => ({
            left: size - right - margin,
            right: size - left - margin
          }) : ({ top, bottom }) => ({
            left: top + margin,
            right: bottom + margin
          });
        }
        const pxSize = this.pages * this.size;
        return __privateGet(this, _rtl2) ? ({ left, right }) => ({
          left: pxSize - right,
          right: pxSize - left
        }) : __privateGet(this, _vertical2) ? ({ top, bottom }) => ({
          left: top,
          right: bottom
        }) : (f3) => f3;
      };
      scrollToRect_fn = async function(rect, reason) {
        if (this.scrolled) {
          const offset2 = __privateMethod(this, _Paginator_instances, getRectMapper_fn).call(this)(rect).left - __privateGet(this, _margin);
          return __privateMethod(this, _Paginator_instances, scrollTo_fn).call(this, offset2, reason);
        }
        const offset = __privateMethod(this, _Paginator_instances, getRectMapper_fn).call(this)(rect).left;
        return __privateMethod(this, _Paginator_instances, scrollToPage_fn).call(this, Math.floor(offset / this.size) + (__privateGet(this, _rtl2) ? -1 : 1), reason);
      };
      scrollTo_fn = async function(offset, reason, smooth) {
        const { size } = this;
        if (this.containerPosition === offset) {
          __privateSet(this, _scrollBounds, [
            offset,
            this.atStart ? 0 : size,
            this.atEnd ? 0 : size
          ]);
          __privateMethod(this, _Paginator_instances, afterScroll_fn).call(this, reason);
          return;
        }
        if (this.scrolled && __privateGet(this, _vertical2)) offset = -offset;
        if ((reason === "snap" || smooth) && this.hasAttribute("animated"))
          return animate(
            this.containerPosition,
            offset,
            300,
            easeOutQuad,
            (x3) => this.containerPosition = x3
          ).then(() => {
            __privateSet(this, _scrollBounds, [
              offset,
              this.atStart ? 0 : size,
              this.atEnd ? 0 : size
            ]);
            __privateMethod(this, _Paginator_instances, afterScroll_fn).call(this, reason);
          });
        else {
          this.containerPosition = offset;
          __privateSet(this, _scrollBounds, [
            offset,
            this.atStart ? 0 : size,
            this.atEnd ? 0 : size
          ]);
          __privateMethod(this, _Paginator_instances, afterScroll_fn).call(this, reason);
        }
      };
      scrollToPage_fn = async function(page, reason, smooth) {
        const offset = this.size * (__privateGet(this, _rtl2) ? -page : page);
        return __privateMethod(this, _Paginator_instances, scrollTo_fn).call(this, offset, reason, smooth);
      };
      scrollToAnchor_fn = async function(anchor, reason = "anchor") {
        __privateSet(this, _anchor, anchor);
        const target = uncollapse(anchor);
        const rects = target?.getClientRects?.();
        if (rects) {
          const rect = Array.from(rects).find(
            (r3) => r3.width > 0 && r3.height > 0
          ) || rects[0];
          if (!rect) return;
          await __privateMethod(this, _Paginator_instances, scrollToRect_fn).call(this, rect, reason);
          return;
        }
        if (this.scrolled) {
          await __privateMethod(this, _Paginator_instances, scrollTo_fn).call(this, anchor * this.viewSize, reason);
          return;
        }
        const { pages } = this;
        if (!pages) return;
        const textPages = pages - 2;
        const newPage = Math.round(anchor * (textPages - 1));
        await __privateMethod(this, _Paginator_instances, scrollToPage_fn).call(this, newPage + 1, reason);
      };
      getVisibleRange_fn = function() {
        const doc = __privateGet(this, _view).document;
        if (this.scrolled)
          return getVisibleRange(
            doc,
            this.start + __privateGet(this, _margin),
            this.end - __privateGet(this, _margin),
            __privateMethod(this, _Paginator_instances, getRectMapper_fn).call(this)
          );
        const size = __privateGet(this, _rtl2) ? -this.size : this.size;
        return getVisibleRange(
          doc,
          this.start - size,
          this.end - size,
          __privateMethod(this, _Paginator_instances, getRectMapper_fn).call(this)
        );
      };
      afterScroll_fn = function(reason) {
        const range = __privateMethod(this, _Paginator_instances, getVisibleRange_fn).call(this);
        __privateSet(this, _lastVisibleRange, range);
        if (reason !== "selection" && reason !== "navigation" && reason !== "anchor")
          __privateSet(this, _anchor, range);
        else __privateSet(this, _justAnchored, true);
        const index = __privateGet(this, _index2);
        const detail = { reason, range, index };
        if (this.scrolled)
          detail.fraction = this.start / this.viewSize;
        else if (this.pages > 0) {
          const { page, pages } = this;
          __privateGet(this, _header).style.visibility = page > 1 ? "visible" : "hidden";
          detail.fraction = (page - 1) / (pages - 2);
          detail.size = 1 / (pages - 2);
        }
        this.dispatchEvent(new CustomEvent("relocate", { detail }));
      };
      display_fn = async function(promise) {
        const { index, src, anchor, onLoad, select } = await promise;
        if (index == null) return;
        __privateSet(this, _index2, index);
        const hasFocus = __privateGet(this, _view)?.document?.hasFocus();
        if (src) {
          const view = __privateMethod(this, _Paginator_instances, createView_fn).call(this);
          const afterLoad = (doc) => {
            if (doc.head) {
              const $styleBefore = doc.createElement("style");
              doc.head.prepend($styleBefore);
              const $style = doc.createElement("style");
              doc.head.append($style);
              __privateGet(this, _styleMap).set(doc, [$styleBefore, $style]);
            }
            onLoad?.({ doc, index });
          };
          const beforeRender = __privateMethod(this, _Paginator_instances, beforeRender_fn).bind(this);
          await view.load(src, afterLoad, beforeRender);
          this.dispatchEvent(
            new CustomEvent("create-overlayer", {
              detail: {
                doc: view.document,
                index,
                attach: (overlayer) => view.overlayer = overlayer
              }
            })
          );
          __privateSet(this, _view, view);
        }
        const resolvedAnchor = typeof anchor === "function" ? anchor(__privateGet(this, _view).document) : anchor;
        await this.scrollToAnchor(
          resolvedAnchor ?? 0,
          select
        );
        if (hasFocus) this.focusView();
      };
      canGoToIndex_fn = function(index) {
        return index >= 0 && index <= this.sections.length - 1;
      };
      goTo_fn = async function({ index, anchor, select }) {
        if (index === __privateGet(this, _index2))
          await __privateMethod(this, _Paginator_instances, display_fn).call(this, Promise.resolve({ index, anchor, select }));
        else {
          const oldIndex = __privateGet(this, _index2);
          const onLoad = (detail) => {
            this.sections[oldIndex]?.unload?.();
            this.setStyles(__privateGet(this, _styles));
            this.dispatchEvent(new CustomEvent("load", { detail }));
          };
          await __privateMethod(this, _Paginator_instances, display_fn).call(this, Promise.resolve(this.sections[index].load()).then((src) => ({ index, src, anchor, onLoad, select })).catch((e3) => {
            console.warn(e3);
            console.warn(
              new Error(
                \`Failed to load section \${index}\`
              )
            );
            return {};
          }));
        }
      };
      scrollPrev_fn = function(distance) {
        if (!__privateGet(this, _view)) return true;
        if (this.scrolled) {
          if (this.start > 0)
            return __privateMethod(this, _Paginator_instances, scrollTo_fn).call(this, Math.max(0, this.start - (distance ?? this.size)), "", true);
          return !this.atStart;
        }
        if (this.atStart) return;
        const page = this.page - 1;
        return __privateMethod(this, _Paginator_instances, scrollToPage_fn).call(this, page, "page", true).then(
          () => page <= 0
        );
      };
      scrollNext_fn = function(distance) {
        if (!__privateGet(this, _view)) return true;
        if (this.scrolled) {
          if (this.viewSize - this.end > 2)
            return __privateMethod(this, _Paginator_instances, scrollTo_fn).call(this, Math.min(
              this.viewSize,
              distance ? this.start + distance : this.end
            ), "", true);
          return !this.atEnd;
        }
        if (this.atEnd) return;
        const page = this.page + 1;
        const pages = this.pages;
        return __privateMethod(this, _Paginator_instances, scrollToPage_fn).call(this, page, "page", true).then(
          () => page >= pages - 1
        );
      };
      adjacentIndex_fn = function(dir) {
        for (let index = __privateGet(this, _index2) + dir; __privateMethod(this, _Paginator_instances, canGoToIndex_fn).call(this, index); index += dir)
          if (this.sections[index]?.linear !== "no") return index;
      };
      turnPage_fn = async function(dir, distance) {
        if (__privateGet(this, _locked)) return;
        if (__privateGet(this, _Paginator_instances, pageCurlEnabled_get) && !distance) {
          __privateSet(this, _locked, true);
          const safetyTimer2 = setTimeout(() => {
            __privateSet(this, _locked, false);
          }, 5e3);
          try {
            await __privateMethod(this, _Paginator_instances, animatedPageCurl_fn).call(this, dir);
          } finally {
            clearTimeout(safetyTimer2);
            __privateSet(this, _locked, false);
          }
          return;
        }
        __privateSet(this, _locked, true);
        const safetyTimer = setTimeout(() => {
          __privateSet(this, _locked, false);
        }, 5e3);
        try {
          const prev = dir === -1;
          const shouldGo = await (prev ? __privateMethod(this, _Paginator_instances, scrollPrev_fn).call(this, distance) : __privateMethod(this, _Paginator_instances, scrollNext_fn).call(this, distance));
          if (shouldGo)
            await __privateMethod(this, _Paginator_instances, goTo_fn).call(this, {
              index: __privateMethod(this, _Paginator_instances, adjacentIndex_fn).call(this, dir),
              anchor: prev ? () => 1 : () => 0
            });
          if (shouldGo || !this.hasAttribute("animated"))
            await wait(100);
        } finally {
          clearTimeout(safetyTimer);
          __privateSet(this, _locked, false);
        }
      };
      __publicField(Paginator, "observedAttributes", [
        "flow",
        "gap",
        "margin",
        "margin-top",
        "margin-bottom",
        "max-inline-size",
        "max-block-size",
        "max-column-count",
        "page-curl"
      ]);
      customElements.define("foliate-paginator", Paginator);
    }
  });

  // src/libs/foliate-js/search.ts
  var search_exports = {};
  __export(search_exports, {
    search: () => search,
    searchMatcher: () => searchMatcher
  });
  var CONTEXT_LENGTH, normalizeWhitespace3, makeExcerpt, simpleSearch, segmenterSearch, search, searchMatcher;
  var init_search = __esm({
    "src/libs/foliate-js/search.ts"() {
      "use strict";
      CONTEXT_LENGTH = 50;
      normalizeWhitespace3 = (str) => str.replace(/\\s+/g, " ");
      makeExcerpt = (strs, { startIndex, startOffset, endIndex, endOffset }) => {
        const start = strs[startIndex];
        const end = strs[endIndex];
        const match = start === end ? start.slice(startOffset, endOffset) : start.slice(startOffset) + strs.slice(startIndex + 1, endIndex).join("") + end.slice(0, endOffset);
        const trimmedStart = normalizeWhitespace3(start.slice(0, startOffset)).trimStart();
        const trimmedEnd = normalizeWhitespace3(end.slice(endOffset)).trimEnd();
        const ellipsisPre = trimmedStart.length < CONTEXT_LENGTH ? "" : "\\u2026";
        const ellipsisPost = trimmedEnd.length < CONTEXT_LENGTH ? "" : "\\u2026";
        const pre = \`\${ellipsisPre}\${trimmedStart.slice(-CONTEXT_LENGTH)}\`;
        const post = \`\${trimmedEnd.slice(0, CONTEXT_LENGTH)}\${ellipsisPost}\`;
        return { pre, match, post };
      };
      simpleSearch = function* (strs, query, options = {}) {
        const { locales = "en", sensitivity } = options;
        const matchCase = sensitivity === "variant";
        const haystack = strs.join("");
        const lowerHaystack = matchCase ? haystack : haystack.toLocaleLowerCase(locales);
        const needle = matchCase ? query : query.toLocaleLowerCase(locales);
        const needleLength = needle.length;
        let index = -1;
        let strIndex = -1;
        let sum = 0;
        do {
          index = lowerHaystack.indexOf(needle, index + 1);
          if (index > -1) {
            while (sum <= index) sum += strs[++strIndex].length;
            const startIndex = strIndex;
            const startOffset = index - (sum - strs[strIndex].length);
            const end = index + needleLength;
            while (sum <= end) sum += strs[++strIndex].length;
            const endIndex = strIndex;
            const endOffset = end - (sum - strs[strIndex].length);
            const range = { startIndex, startOffset, endIndex, endOffset };
            yield { range, excerpt: makeExcerpt(strs, range) };
          }
        } while (index > -1);
      };
      segmenterSearch = function* (strs, query, options = {}) {
        const { locales = "en", granularity = "word", sensitivity = "base" } = options;
        let segmenter, collator;
        try {
          segmenter = new Intl.Segmenter(locales, { usage: "search", granularity });
          collator = new Intl.Collator(locales, { sensitivity });
        } catch (e3) {
          console.warn(e3);
          segmenter = new Intl.Segmenter("en", { usage: "search", granularity });
          collator = new Intl.Collator("en", { sensitivity });
        }
        const queryLength = Array.from(segmenter.segment(query)).length;
        const substrArr = [];
        let strIndex = 0;
        let segments = segmenter.segment(strs[strIndex])[Symbol.iterator]();
        main: while (strIndex < strs.length) {
          while (substrArr.length < queryLength) {
            const { done, value } = segments.next();
            if (done) {
              strIndex++;
              if (strIndex < strs.length) {
                segments = segmenter.segment(strs[strIndex])[Symbol.iterator]();
                continue;
              } else break main;
            }
            const { index, segment } = value;
            if (!/[^\\p{Format}]/u.test(segment)) continue;
            if (/\\s/u.test(segment)) {
              if (!/\\s/u.test(substrArr[substrArr.length - 1]?.segment))
                substrArr.push({ strIndex, index, segment: " " });
              continue;
            }
            value.strIndex = strIndex;
            substrArr.push(value);
          }
          const substr = substrArr.map((x3) => x3.segment).join("");
          if (collator.compare(query, substr) === 0) {
            const endIndex = strIndex;
            const lastSeg = substrArr[substrArr.length - 1];
            const endOffset = lastSeg.index + lastSeg.segment.length;
            const startIndex = substrArr[0].strIndex;
            const startOffset = substrArr[0].index;
            const range = { startIndex, startOffset, endIndex, endOffset };
            yield { range, excerpt: makeExcerpt(strs, range) };
          }
          substrArr.shift();
        }
      };
      search = (strs, query, options) => {
        const { granularity = "grapheme", sensitivity = "base" } = options;
        if (!Intl?.Segmenter || granularity === "grapheme" && (sensitivity === "variant" || sensitivity === "accent"))
          return simpleSearch(strs, query, options);
        return segmenterSearch(strs, query, options);
      };
      searchMatcher = (textWalker2, opts) => {
        const { defaultLocale, matchCase, matchDiacritics, matchWholeWords } = opts;
        return function* (doc, query) {
          const iter = textWalker2(doc, function* (strs, makeRange2) {
            for (const result of search(strs, query, {
              locales: doc.body?.lang || doc.documentElement.lang || defaultLocale || "en",
              granularity: matchWholeWords ? "word" : "grapheme",
              sensitivity: matchDiacritics && matchCase ? "variant" : matchDiacritics && !matchCase ? "accent" : !matchDiacritics && matchCase ? "case" : "base"
            })) {
              const { startIndex, startOffset, endIndex, endOffset } = result.range;
              result.range = makeRange2(startIndex, startOffset, endIndex, endOffset);
              yield result;
            }
          });
          for (const result of iter) yield result;
        };
      };
    }
  });

  // src/libs/foliate-js/tts.ts
  var tts_exports = {};
  __export(tts_exports, {
    TTS: () => TTS
  });
  function* getBlocks(doc) {
    let last;
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const name = node.tagName.toLowerCase();
      if (blockTags.has(name)) {
        if (last) {
          last.setEndBefore(node);
          if (!rangeIsEmpty(last)) yield last;
        }
        last = doc.createRange();
        last.setStart(node, 0);
      }
    }
    if (!last) {
      last = doc.createRange();
      last.setStart(doc.body.firstChild ?? doc.body, 0);
    }
    last.setEndAfter(doc.body.lastChild ?? doc.body);
    if (!rangeIsEmpty(last)) yield last;
  }
  var NS3, blockTags, getLang, getAlphabet, getSegmenter, fragmentToSSML, getFragmentWithMarks, rangeIsEmpty, _arr, _iter, _index3, _f, ListIterator, _list, _ranges, _lastMark, _serializer, _TTS_instances, getMarkElement_fn, speak_fn, TTS;
  var init_tts = __esm({
    "src/libs/foliate-js/tts.ts"() {
      "use strict";
      NS3 = {
        XML: "http://www.w3.org/XML/1998/namespace",
        SSML: "http://www.w3.org/2001/10/synthesis"
      };
      blockTags = /* @__PURE__ */ new Set([
        "article",
        "aside",
        "audio",
        "blockquote",
        "caption",
        "details",
        "dialog",
        "div",
        "dl",
        "dt",
        "dd",
        "figure",
        "footer",
        "form",
        "figcaption",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "header",
        "hgroup",
        "hr",
        "li",
        "main",
        "math",
        "nav",
        "ol",
        "p",
        "pre",
        "section",
        "tr"
      ]);
      getLang = (el) => {
        if (!el) return null;
        const x3 = el.lang || el?.getAttributeNS?.(NS3.XML, "lang");
        return x3 ? x3 : el.parentElement ? getLang(el.parentElement) : null;
      };
      getAlphabet = (el) => {
        if (!el) return null;
        const x3 = el?.getAttributeNS?.(NS3.XML, "lang");
        return x3 ? x3 : el.parentElement ? getAlphabet(el.parentElement) : null;
      };
      getSegmenter = (lang = "en", granularity = "word") => {
        const segmenter = new Intl.Segmenter(lang, { granularity });
        const granularityIsWord = granularity === "word";
        return function* (strs, makeRange2) {
          const str = strs.join("").replace(/\\r\\n/g, "  ").replace(/\\r/g, " ").replace(/\\n/g, " ");
          let name = 0;
          let strIndex = -1;
          let sum = 0;
          const rawSegments = Array.from(segmenter.segment(str));
          const mergedSegments = [];
          for (let i3 = 0; i3 < rawSegments.length; i3++) {
            const current = rawSegments[i3];
            const next = rawSegments[i3 + 1];
            const segment = current.segment.trim();
            const nextSegment = next?.segment?.trim();
            const endsWithAbbr = /(?:^|\\s)([A-Z][a-z]{1,5})\\.$/.test(segment);
            const nextStartsWithCapital = /^[A-Z]/.test(nextSegment || "");
            if (endsWithAbbr && nextStartsWithCapital) {
              const mergedSegment = {
                index: current.index,
                segment: current.segment + (next?.segment || ""),
                isWordLike: true
              };
              mergedSegments.push(mergedSegment);
              i3++;
            } else {
              mergedSegments.push(current);
            }
          }
          for (const { index, segment, isWordLike } of mergedSegments) {
            if (granularityIsWord && !isWordLike) continue;
            while (sum <= index) sum += strs[++strIndex].length;
            const startIndex = strIndex;
            const startOffset = index - (sum - strs[strIndex].length);
            const end = index + segment.length - 1;
            if (end < str.length) while (sum <= end) sum += strs[++strIndex].length;
            const endIndex = strIndex;
            const endOffset = end - (sum - strs[strIndex].length) + 1;
            yield [
              (name++).toString(),
              makeRange2(startIndex, startOffset, endIndex, endOffset)
            ];
          }
        };
      };
      fragmentToSSML = (fragment, inherited) => {
        const ssml = document.implementation.createDocument(NS3.SSML, "speak");
        const { lang } = inherited;
        if (lang) ssml.documentElement.setAttributeNS(NS3.XML, "lang", lang);
        const convert = (node, parent, inheritedAlphabet) => {
          if (!node) return;
          if (node.nodeType === 3) return ssml.createTextNode(node.textContent ?? "");
          if (node.nodeType === 4) return ssml.createCDATASection(node.textContent ?? "");
          if (node.nodeType !== 1) return;
          const element = node;
          let el;
          const nodeName = element.nodeName.toLowerCase();
          if (nodeName === "foliate-mark") {
            el = ssml.createElementNS(NS3.SSML, "mark");
            el.setAttribute("name", element.dataset.name ?? "");
          } else if (nodeName === "br")
            el = ssml.createElementNS(NS3.SSML, "break");
          else if (nodeName === "em" || nodeName === "strong")
            el = ssml.createElementNS(NS3.SSML, "emphasis");
          const lang2 = element.lang || element.getAttributeNS(NS3.XML, "lang");
          if (lang2) {
            if (!el) el = ssml.createElementNS(NS3.SSML, "lang");
            el.setAttributeNS(NS3.XML, "lang", lang2);
          }
          const alphabet = element.getAttributeNS(NS3.SSML, "alphabet") || inheritedAlphabet;
          if (!el) {
            const ph = element.getAttributeNS(NS3.SSML, "ph");
            if (ph) {
              el = ssml.createElementNS(NS3.SSML, "phoneme");
              if (alphabet) el.setAttribute("alphabet", alphabet);
              el.setAttribute("ph", ph);
            }
          }
          const targetEl = el ?? parent;
          let child = element.firstChild;
          while (child) {
            const childEl = convert(child, targetEl, alphabet);
            if (childEl && targetEl !== childEl) targetEl.append(childEl);
            child = child.nextSibling;
          }
          return targetEl === parent ? void 0 : targetEl;
        };
        convert(fragment.firstChild, ssml.documentElement, inherited.alphabet);
        return ssml;
      };
      getFragmentWithMarks = (range, textWalker2, granularity) => {
        const lang = getLang(range.commonAncestorContainer);
        const alphabet = getAlphabet(range.commonAncestorContainer);
        const segmenter = getSegmenter(lang ?? void 0, granularity);
        const fragment = range.cloneContents();
        const entries = [...textWalker2(range, segmenter)];
        const fragmentEntries = [...textWalker2(fragment, segmenter)];
        for (const [name, range2] of fragmentEntries) {
          const mark = document.createElement("foliate-mark");
          mark.dataset.name = name;
          range2.insertNode(mark);
        }
        const ssml = fragmentToSSML(fragment, { lang, alphabet });
        return { entries, ssml };
      };
      rangeIsEmpty = (range) => !range.toString().trim();
      ListIterator = class {
        constructor(iter, f3 = (x3) => x3) {
          __privateAdd(this, _arr, []);
          __privateAdd(this, _iter);
          __privateAdd(this, _index3, -1);
          __privateAdd(this, _f);
          __privateSet(this, _iter, iter);
          __privateSet(this, _f, f3);
        }
        current() {
          if (__privateGet(this, _arr)[__privateGet(this, _index3)]) return __privateGet(this, _f).call(this, __privateGet(this, _arr)[__privateGet(this, _index3)]);
        }
        first() {
          const newIndex = 0;
          if (__privateGet(this, _arr)[newIndex]) {
            __privateSet(this, _index3, newIndex);
            return __privateGet(this, _f).call(this, __privateGet(this, _arr)[newIndex]);
          }
        }
        prev() {
          const newIndex = __privateGet(this, _index3) - 1;
          if (__privateGet(this, _arr)[newIndex]) {
            __privateSet(this, _index3, newIndex);
            return __privateGet(this, _f).call(this, __privateGet(this, _arr)[newIndex]);
          }
        }
        next() {
          const newIndex = __privateGet(this, _index3) + 1;
          if (__privateGet(this, _arr)[newIndex]) {
            __privateSet(this, _index3, newIndex);
            return __privateGet(this, _f).call(this, __privateGet(this, _arr)[newIndex]);
          }
          while (true) {
            const { done, value } = __privateGet(this, _iter).next();
            if (done) break;
            __privateGet(this, _arr).push(value);
            if (__privateGet(this, _arr)[newIndex]) {
              __privateSet(this, _index3, newIndex);
              return __privateGet(this, _f).call(this, __privateGet(this, _arr)[newIndex]);
            }
          }
        }
        find(f3) {
          const index = __privateGet(this, _arr).findIndex((x3) => f3(x3));
          if (index > -1) {
            __privateSet(this, _index3, index);
            return __privateGet(this, _f).call(this, __privateGet(this, _arr)[index]);
          }
          while (true) {
            const { done, value } = __privateGet(this, _iter).next();
            if (done) break;
            __privateGet(this, _arr).push(value);
            if (f3(value)) {
              __privateSet(this, _index3, __privateGet(this, _arr).length - 1);
              return __privateGet(this, _f).call(this, value);
            }
          }
        }
      };
      _arr = new WeakMap();
      _iter = new WeakMap();
      _index3 = new WeakMap();
      _f = new WeakMap();
      TTS = class {
        constructor(doc, textWalker2, highlight, granularity) {
          __privateAdd(this, _TTS_instances);
          __privateAdd(this, _list);
          __privateAdd(this, _ranges, /* @__PURE__ */ new Map());
          __privateAdd(this, _lastMark, null);
          __privateAdd(this, _serializer, new XMLSerializer());
          __publicField(this, "doc");
          __publicField(this, "highlight");
          this.doc = doc;
          this.highlight = highlight;
          __privateSet(this, _list, new ListIterator(getBlocks(doc), (range) => {
            const { entries, ssml } = getFragmentWithMarks(range, textWalker2, granularity);
            __privateSet(this, _ranges, new Map(entries));
            return [ssml, range];
          }));
        }
        start() {
          __privateSet(this, _lastMark, null);
          const [doc] = __privateGet(this, _list).first() ?? [];
          if (!doc) return this.next();
          return __privateMethod(this, _TTS_instances, speak_fn).call(this, doc, (ssml) => __privateMethod(this, _TTS_instances, getMarkElement_fn).call(this, ssml, __privateGet(this, _lastMark)));
        }
        resume() {
          const [doc] = __privateGet(this, _list).current() ?? [];
          if (!doc) return this.next();
          return __privateMethod(this, _TTS_instances, speak_fn).call(this, doc, (ssml) => __privateMethod(this, _TTS_instances, getMarkElement_fn).call(this, ssml, __privateGet(this, _lastMark)));
        }
        prev(paused) {
          __privateSet(this, _lastMark, null);
          const [doc, range] = __privateGet(this, _list).prev() ?? [];
          if (paused && range) this.highlight(range.cloneRange());
          return __privateMethod(this, _TTS_instances, speak_fn).call(this, doc);
        }
        next(paused) {
          __privateSet(this, _lastMark, null);
          const [doc, range] = __privateGet(this, _list).next() ?? [];
          if (paused && range) this.highlight(range.cloneRange());
          return __privateMethod(this, _TTS_instances, speak_fn).call(this, doc);
        }
        from(range) {
          __privateSet(this, _lastMark, null);
          const [doc] = __privateGet(this, _list).find((range_) => range.compareBoundaryPoints(Range.END_TO_START, range_) <= 0) ?? [];
          let mark;
          for (const [name, range_] of __privateGet(this, _ranges).entries())
            if (range.compareBoundaryPoints(Range.START_TO_START, range_) <= 0) {
              mark = name;
              break;
            }
          return __privateMethod(this, _TTS_instances, speak_fn).call(this, doc, (ssml) => __privateMethod(this, _TTS_instances, getMarkElement_fn).call(this, ssml, mark ?? null));
        }
        setMark(mark) {
          const range = __privateGet(this, _ranges).get(mark);
          if (range) {
            __privateSet(this, _lastMark, mark);
            this.highlight(range.cloneRange());
          }
        }
      };
      _list = new WeakMap();
      _ranges = new WeakMap();
      _lastMark = new WeakMap();
      _serializer = new WeakMap();
      _TTS_instances = new WeakSet();
      getMarkElement_fn = function(doc, mark) {
        if (!mark) return null;
        return doc.querySelector(\`mark[name="\${CSS.escape(mark)}"\`);
      };
      speak_fn = function(doc, getNode) {
        if (!doc) return;
        if (!getNode) return __privateGet(this, _serializer).serializeToString(doc);
        const ssml = document.implementation.createDocument(NS3.SSML, "speak");
        ssml.documentElement.replaceWith(ssml.importNode(doc.documentElement, true));
        let node = getNode(ssml)?.previousSibling ?? null;
        while (node) {
          const next = node.previousSibling ?? node.parentNode?.previousSibling ?? null;
          node.parentNode?.removeChild(node);
          node = next;
        }
        return __privateGet(this, _serializer).serializeToString(ssml);
      };
    }
  });

  // src/libs/foliate-js/view.ts
  var view_exports = {};
  __export(view_exports, {
    NotFoundError: () => NotFoundError,
    ResponseError: () => ResponseError,
    UnsupportedTypeError: () => UnsupportedTypeError,
    View: () => View2,
    makeBook: () => makeBook
  });
  init_epubcfi();

  // src/libs/foliate-js/progress.ts
  var assignIDs = (toc) => {
    let id = 0;
    const assignID = (item) => {
      item.id = id++;
      if (item.subitems) for (const subitem of item.subitems) assignID(subitem);
    };
    for (const item of toc) assignID(item);
    return toc;
  };
  var flatten = (items) => items.map((item) => item.subitems?.length ? [item, flatten(item.subitems)].flat() : item).flat();
  var TOCProgress = class {
    constructor() {
      __publicField(this, "ids");
      __publicField(this, "map");
      __publicField(this, "getFragment");
    }
    async init({ toc, ids, splitHref, getFragment }) {
      assignIDs(toc);
      const items = flatten(toc);
      const grouped = /* @__PURE__ */ new Map();
      for (const [i3, item] of items.entries()) {
        const [id, fragment] = await splitHref(item?.href) ?? [];
        const value = { fragment, item };
        if (grouped.has(id)) grouped.get(id).items.push(value);
        else grouped.set(id, { prev: items[i3 - 1], items: [value] });
      }
      const map = /* @__PURE__ */ new Map();
      for (const [i3, id] of ids.entries()) {
        if (grouped.has(id)) map.set(id, grouped.get(id));
        else map.set(id, map.get(ids[i3 - 1]));
      }
      this.ids = ids;
      this.map = map;
      this.getFragment = getFragment;
    }
    getProgress(index, range) {
      if (!this.ids) return;
      const id = this.ids[index];
      const obj = this.map.get(id);
      if (!obj) return null;
      const { prev, items } = obj;
      if (!items) return prev;
      if (!range || items.length === 1 && !items[0].fragment) return items[0].item;
      const doc = range.startContainer.getRootNode();
      for (const [i3, { fragment }] of items.entries()) {
        const el = this.getFragment(doc, fragment);
        if (!el) continue;
        if (range.comparePoint(el, 0) > 0)
          return items[i3 - 1]?.item ?? prev;
      }
      return items[items.length - 1].item;
    }
  };
  var _SectionProgress_instances, getSectionFractions_fn;
  var SectionProgress = class {
    constructor(sections, sizePerLoc, sizePerTimeUnit) {
      __privateAdd(this, _SectionProgress_instances);
      __publicField(this, "sizes");
      __publicField(this, "sizePerLoc");
      __publicField(this, "sizePerTimeUnit");
      __publicField(this, "sizeTotal");
      __publicField(this, "sectionFractions");
      this.sizes = sections.map((s3) => s3.linear != "no" && s3.size > 0 ? s3.size : 0);
      this.sizePerLoc = sizePerLoc;
      this.sizePerTimeUnit = sizePerTimeUnit;
      this.sizeTotal = this.sizes.reduce((a3, b3) => a3 + b3, 0);
      this.sectionFractions = __privateMethod(this, _SectionProgress_instances, getSectionFractions_fn).call(this);
    }
    // get progress given index of and fractions within a section
    getProgress(index, fractionInSection, pageFraction = 0) {
      const { sizes, sizePerLoc, sizePerTimeUnit, sizeTotal } = this;
      const sizeInSection = sizes[index] ?? 0;
      const sizeBefore = sizes.slice(0, index).reduce((a3, b3) => a3 + b3, 0);
      const size = sizeBefore + fractionInSection * sizeInSection;
      const nextSize = size + pageFraction * sizeInSection;
      const remainingTotal = sizeTotal - size;
      const remainingSection = (1 - fractionInSection) * sizeInSection;
      return {
        fraction: nextSize / sizeTotal,
        section: {
          current: index,
          total: sizes.length
        },
        location: {
          current: Math.floor(size / sizePerLoc),
          next: Math.floor(nextSize / sizePerLoc),
          total: Math.ceil(sizeTotal / sizePerLoc)
        },
        time: {
          section: remainingSection / sizePerTimeUnit,
          total: remainingTotal / sizePerTimeUnit
        }
      };
    }
    // the inverse of \`getProgress\`
    // get index of and fraction in section based on total fraction
    getSection(fraction) {
      if (fraction <= 0) return [0, 0];
      if (fraction >= 1) return [this.sizes.length - 1, 1];
      fraction = fraction + Number.EPSILON;
      const { sizeTotal } = this;
      let index = this.sectionFractions.findIndex((x3) => x3 > fraction) - 1;
      if (index < 0) return [0, 0];
      while (!this.sizes[index]) index++;
      const fractionInSection = (fraction - this.sectionFractions[index]) / (this.sizes[index] / sizeTotal);
      return [index, fractionInSection];
    }
  };
  _SectionProgress_instances = new WeakSet();
  getSectionFractions_fn = function() {
    const { sizeTotal } = this;
    const results = [0];
    let sum = 0;
    for (const size of this.sizes) results.push((sum += size) / sizeTotal);
    return results;
  };

  // src/libs/foliate-js/overlayer.ts
  var createSVGElement = (tag) => document.createElementNS("http://www.w3.org/2000/svg", tag);
  var _svg, _map, _doc, _Overlayer_instances, zoom_get, splitRangeByParagraph_fn, getScaledRects_fn;
  var Overlayer = class {
    constructor(doc) {
      __privateAdd(this, _Overlayer_instances);
      __privateAdd(this, _svg, createSVGElement("svg"));
      __privateAdd(this, _map, /* @__PURE__ */ new Map());
      __privateAdd(this, _doc);
      __privateSet(this, _doc, doc);
      Object.assign(__privateGet(this, _svg).style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none"
      });
    }
    get element() {
      return __privateGet(this, _svg);
    }
    add(key, range, draw, options) {
      if (__privateGet(this, _map).has(key)) this.remove(key);
      if (typeof range === "function")
        range = range(__privateGet(this, _svg).getRootNode());
      const rects = __privateMethod(this, _Overlayer_instances, getScaledRects_fn).call(this, range);
      const element = draw(rects, options);
      __privateGet(this, _svg).append(element);
      __privateGet(this, _map).set(key, { range, draw, options, element, rects });
    }
    remove(key) {
      const entry = __privateGet(this, _map).get(key);
      if (!entry) return;
      __privateGet(this, _svg).removeChild(entry.element);
      __privateGet(this, _map).delete(key);
    }
    redraw() {
      for (const obj of __privateGet(this, _map).values()) {
        const { range, draw, options, element } = obj;
        __privateGet(this, _svg).removeChild(element);
        const rects = __privateMethod(this, _Overlayer_instances, getScaledRects_fn).call(this, range);
        const el = draw(rects, options);
        __privateGet(this, _svg).append(el);
        obj.element = el;
        obj.rects = rects;
      }
    }
    hitTest({ x: x3, y: y3 }) {
      const arr = Array.from(__privateGet(this, _map).entries());
      for (let i3 = arr.length - 1; i3 >= 0; i3--) {
        const [key, obj] = arr[i3];
        for (const { left, top, right, bottom } of obj.rects)
          if (top <= y3 && left <= x3 && bottom > y3 && right > x3)
            return [key, obj.range];
      }
      return [];
    }
    static underline(rects, options = {}) {
      const {
        color = "red",
        width: strokeWidth = 2,
        padding = 0,
        writingMode
      } = options;
      const g3 = createSVGElement("g");
      g3.setAttribute("fill", color);
      if (writingMode === "vertical-rl" || writingMode === "vertical-lr")
        for (const { right, top, height } of rects) {
          const el = createSVGElement("rect");
          el.setAttribute(
            "x",
            String(right - strokeWidth / 2 + padding)
          );
          el.setAttribute("y", String(top));
          el.setAttribute("height", String(height));
          el.setAttribute("width", String(strokeWidth));
          g3.append(el);
        }
      else
        for (const { left, bottom, width } of rects) {
          const el = createSVGElement("rect");
          el.setAttribute("x", String(left));
          el.setAttribute(
            "y",
            String(bottom - strokeWidth / 2 + padding)
          );
          el.setAttribute("height", String(strokeWidth));
          el.setAttribute("width", String(width));
          g3.append(el);
        }
      return g3;
    }
    static strikethrough(rects, options = {}) {
      const {
        color = "red",
        width: strokeWidth = 2,
        writingMode
      } = options;
      const g3 = createSVGElement("g");
      g3.setAttribute("fill", color);
      if (writingMode === "vertical-rl" || writingMode === "vertical-lr")
        for (const { right, left, top, height } of rects) {
          const el = createSVGElement("rect");
          el.setAttribute("x", String((right + left) / 2));
          el.setAttribute("y", String(top));
          el.setAttribute("height", String(height));
          el.setAttribute("width", String(strokeWidth));
          g3.append(el);
        }
      else
        for (const { left, top, bottom, width } of rects) {
          const el = createSVGElement("rect");
          el.setAttribute("x", String(left));
          el.setAttribute("y", String((top + bottom) / 2));
          el.setAttribute("height", String(strokeWidth));
          el.setAttribute("width", String(width));
          g3.append(el);
        }
      return g3;
    }
    static squiggly(rects, options = {}) {
      const {
        color = "red",
        width: strokeWidth = 2,
        padding = 0,
        writingMode
      } = options;
      const g3 = createSVGElement("g");
      g3.setAttribute("fill", "none");
      g3.setAttribute("stroke", color);
      g3.setAttribute("stroke-width", String(strokeWidth));
      const block = strokeWidth * 1.5;
      if (writingMode === "vertical-rl" || writingMode === "vertical-lr")
        for (const { right, top, height } of rects) {
          const el = createSVGElement("path");
          const n3 = Math.round(height / block / 1.5);
          const inline = height / n3;
          const ls = Array.from(
            { length: n3 },
            (_2, i3) => \`l\${i3 % 2 ? -block : block} \${inline}\`
          ).join("");
          el.setAttribute(
            "d",
            \`M\${right - strokeWidth / 2 + padding} \${top}\${ls}\`
          );
          g3.append(el);
        }
      else
        for (const { left, bottom, width } of rects) {
          const el = createSVGElement("path");
          const n3 = Math.round(width / block / 1.5);
          const inline = width / n3;
          const ls = Array.from(
            { length: n3 },
            (_2, i3) => \`l\${inline} \${i3 % 2 ? block : -block}\`
          ).join("");
          el.setAttribute(
            "d",
            \`M\${left} \${bottom + strokeWidth / 2 + padding}\${ls}\`
          );
          g3.append(el);
        }
      return g3;
    }
    static highlight(rects, options = {}) {
      const { color = "red", padding = 0 } = options;
      const g3 = createSVGElement("g");
      g3.setAttribute("fill", color);
      g3.style.opacity = "var(--overlayer-highlight-opacity, .3)";
      g3.style.mixBlendMode = "var(--overlayer-highlight-blend-mode, normal)";
      for (const { left, top, height, width } of rects) {
        const el = createSVGElement("rect");
        el.setAttribute("x", String(left - padding));
        el.setAttribute("y", String(top - padding));
        el.setAttribute(
          "height",
          String(height + padding * 2)
        );
        el.setAttribute(
          "width",
          String(width + padding * 2)
        );
        g3.append(el);
      }
      return g3;
    }
    static outline(rects, options = {}) {
      const {
        color = "red",
        width: strokeWidth = 3,
        padding = 0,
        radius = 3
      } = options;
      const g3 = createSVGElement("g");
      g3.setAttribute("fill", "none");
      g3.setAttribute("stroke", color);
      g3.setAttribute("stroke-width", String(strokeWidth));
      for (const { left, top, height, width } of rects) {
        const el = createSVGElement("rect");
        el.setAttribute("x", String(left - padding));
        el.setAttribute("y", String(top - padding));
        el.setAttribute(
          "height",
          String(height + padding * 2)
        );
        el.setAttribute(
          "width",
          String(width + padding * 2)
        );
        el.setAttribute("rx", String(radius));
        g3.append(el);
      }
      return g3;
    }
    // make an exact copy of an image in the overlay
    static copyImage([rect], options = { src: "" }) {
      const { src } = options;
      const image = createSVGElement("image");
      const { left, top, height, width } = rect;
      image.setAttribute("href", src);
      image.setAttribute("x", String(left));
      image.setAttribute("y", String(top));
      image.setAttribute("height", String(height));
      image.setAttribute("width", String(width));
      return image;
    }
  };
  _svg = new WeakMap();
  _map = new WeakMap();
  _doc = new WeakMap();
  _Overlayer_instances = new WeakSet();
  zoom_get = function() {
    if (/^((?!chrome|android).)*AppleWebKit/i.test(
      navigator.userAgent
    ) && !window.chrome) {
      const body = __privateGet(this, _doc).body;
      if (!body) return 1;
      return parseFloat(
        window.getComputedStyle(body).zoom || "1"
      ) || 1;
    }
    return 1;
  };
  splitRangeByParagraph_fn = function(range) {
    const ancestor = range.commonAncestorContainer;
    const paragraphs = Array.from(
      ancestor.querySelectorAll?.("p") || []
    );
    if (paragraphs.length === 0) return [range];
    const splitRanges = [];
    paragraphs.forEach((p3) => {
      const pRange = document.createRange();
      if (range.intersectsNode(p3)) {
        pRange.selectNodeContents(p3);
        if (pRange.compareBoundaryPoints(
          Range.START_TO_START,
          range
        ) < 0) {
          pRange.setStart(
            range.startContainer,
            range.startOffset
          );
        }
        if (pRange.compareBoundaryPoints(
          Range.END_TO_END,
          range
        ) > 0) {
          pRange.setEnd(
            range.endContainer,
            range.endOffset
          );
        }
        splitRanges.push(pRange);
      }
    });
    return splitRanges;
  };
  getScaledRects_fn = function(range) {
    const zoom = __privateGet(this, _Overlayer_instances, zoom_get);
    let rects = [];
    __privateMethod(this, _Overlayer_instances, splitRangeByParagraph_fn).call(this, range).forEach((pRange) => {
      const pRects = Array.from(pRange.getClientRects()).map(
        (rect) => ({
          left: rect.left * zoom,
          top: rect.top * zoom,
          right: rect.right * zoom,
          bottom: rect.bottom * zoom,
          width: rect.width * zoom,
          height: rect.height * zoom
        })
      );
      rects = rects.concat(pRects);
    });
    return rects;
  };

  // src/libs/foliate-js/text-walker.ts
  var walkRange = (range, walker) => {
    const nodes = [];
    for (let node = walker.currentNode; node; node = walker.nextNode()) {
      const compare = range.comparePoint(node, 0);
      if (compare === 0) nodes.push(node);
      else if (compare > 0) break;
    }
    return nodes;
  };
  var walkDocument = (_2, walker) => {
    const nodes = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode())
      nodes.push(node);
    return nodes;
  };
  var filter = NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT | NodeFilter.SHOW_CDATA_SECTION;
  var acceptNode = (node) => {
    if (node.nodeType === 1) {
      const name = node.tagName.toLowerCase();
      if (name === "script" || name === "style")
        return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_SKIP;
    }
    return NodeFilter.FILTER_ACCEPT;
  };
  var textWalker = function* (x3, func) {
    const root = x3.commonAncestorContainer ?? x3.body ?? x3;
    const walker = document.createTreeWalker(root, filter, {
      acceptNode
    });
    const walk = x3.commonAncestorContainer ? walkRange : walkDocument;
    const nodes = walk(x3, walker);
    const strs = nodes.map((node) => node.nodeValue ?? "");
    const makeRange2 = (startIndex, startOffset, endIndex, endOffset) => {
      const range = document.createRange();
      range.setStart(nodes[startIndex], startOffset);
      range.setEnd(nodes[endIndex], endOffset);
      return range;
    };
    for (const match of func(strs, makeRange2)) yield match;
  };

  // src/libs/foliate-js/view.ts
  var SEARCH_PREFIX = "foliate-search:";
  var isZip = async (file) => {
    const arr = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    return arr[0] === 80 && arr[1] === 75 && arr[2] === 3 && arr[3] === 4;
  };
  var isCBZ = ({ name, type }) => type === "application/vnd.comicbook+zip" || name.endsWith(".cbz");
  var isFB2 = ({ name, type }) => type === "application/x-fictionbook+xml" || name.endsWith(".fb2");
  var isFBZ = ({ name, type }) => type === "application/x-zip-compressed-fb2" || name.endsWith(".fb2.zip") || name.endsWith(".fbz");
  var makeZipLoader = async (file) => {
    const { configure, ZipReader, BlobReader, TextWriter, BlobWriter } = await Promise.resolve().then(() => (init_zip(), zip_exports));
    configure({ useWebWorkers: false });
    const reader = new ZipReader(new BlobReader(file));
    const entries = await reader.getEntries();
    const map = new Map(entries.map((entry) => [entry.filename, entry]));
    const load = (f3) => (name, ...args) => map.has(name) ? f3(map.get(name), ...args) : null;
    const loadText = load((entry) => entry.getData(new TextWriter()));
    const loadBlob = load((entry, type) => entry.getData(new BlobWriter(type)));
    const getSize = (name) => map.get(name)?.uncompressedSize ?? 0;
    return { entries, loadText, loadBlob, getSize };
  };
  var getFileEntries = async (entry) => entry.isFile ? [entry] : (await Promise.all(Array.from(
    await new Promise((resolve, reject) => entry.createReader().readEntries((entries) => resolve(entries), (error) => reject(error))),
    getFileEntries
  ))).flat();
  var makeDirectoryLoader = async (entry) => {
    const entries = await getFileEntries(entry);
    const files = await Promise.all(
      entries.map((entry2) => new Promise((resolve, reject) => entry2.file(
        (file) => resolve([file, entry2.fullPath]),
        (error) => reject(error)
      )))
    );
    const map = new Map(files.map(([file, path]) => [path.replace(entry.fullPath + "/", ""), file]));
    const decoder2 = new TextDecoder();
    const decode = (x3) => x3 ? decoder2.decode(x3) : null;
    const getBuffer = (name) => map.get(name)?.arrayBuffer() ?? null;
    const loadText = async (name) => decode(await getBuffer(name));
    const loadBlob = (name) => map.get(name) ?? null;
    const getSize = (name) => map.get(name)?.size ?? 0;
    return { loadText, loadBlob, getSize };
  };
  var ResponseError = class extends Error {
  };
  var NotFoundError = class extends Error {
  };
  var UnsupportedTypeError = class extends Error {
  };
  var fetchFile = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new ResponseError(
      \`\${res.status} \${res.statusText}\`,
      { cause: res }
    );
    return new File([await res.blob()], new URL(res.url).pathname);
  };
  var makeBook = async (file) => {
    if (typeof file === "string") file = await fetchFile(file);
    let book;
    if (file.isDirectory) {
      const loader = await makeDirectoryLoader(file);
      const { EPUB: EPUB2 } = await Promise.resolve().then(() => (init_epub(), epub_exports));
      book = await new EPUB2(loader).init();
    } else if (!file.size) throw new NotFoundError("File not found");
    else if (await isZip(file)) {
      const loader = await makeZipLoader(file);
      if (isCBZ(file)) {
        const { makeComicBook: makeComicBook2 } = await Promise.resolve().then(() => (init_comic_book(), comic_book_exports));
        book = await makeComicBook2(loader, file);
      } else if (isFBZ(file)) {
        const { makeFB2: makeFB22 } = await Promise.resolve().then(() => (init_fb2(), fb2_exports));
        const { entries } = loader;
        const entry = entries.find((entry2) => entry2.filename.endsWith(".fb2"));
        const blob = await loader.loadBlob((entry ?? entries[0]).filename);
        book = await makeFB22(blob);
      } else {
        const { EPUB: EPUB2 } = await Promise.resolve().then(() => (init_epub(), epub_exports));
        book = await new EPUB2(loader).init();
      }
    } else {
      const { isMOBI: isMOBI2, MOBI: MOBI2 } = await Promise.resolve().then(() => (init_mobi(), mobi_exports));
      if (await isMOBI2(file)) {
        const fflate = await Promise.resolve().then(() => (init_fflate(), fflate_exports));
        book = await new MOBI2({ unzlib: fflate.unzlibSync }).open(file);
      } else if (isFB2(file)) {
        const { makeFB2: makeFB22 } = await Promise.resolve().then(() => (init_fb2(), fb2_exports));
        book = await makeFB22(file);
      }
    }
    if (!book) throw new UnsupportedTypeError("File type not supported");
    return book;
  };
  var _timeout, _el, _check, _state2;
  var _CursorAutohider = class _CursorAutohider {
    constructor(el, check, state = {}) {
      __privateAdd(this, _timeout);
      __privateAdd(this, _el);
      __privateAdd(this, _check);
      __privateAdd(this, _state2);
      __privateSet(this, _el, el);
      __privateSet(this, _check, check);
      __privateSet(this, _state2, state);
      if (__privateGet(this, _state2).hidden) this.hide();
      __privateGet(this, _el).addEventListener("mousemove", (e3) => {
        const { screenX, screenY } = e3;
        if (screenX === __privateGet(this, _state2).x && screenY === __privateGet(this, _state2).y) return;
        __privateGet(this, _state2).x = screenX;
        __privateGet(this, _state2).y = screenY;
        this.show();
        if (__privateGet(this, _timeout)) clearTimeout(__privateGet(this, _timeout));
        if (__privateGet(this, _check).call(this)) __privateSet(this, _timeout, setTimeout(this.hide.bind(this), 1e3));
      }, false);
    }
    cloneFor(el) {
      return new _CursorAutohider(el, __privateGet(this, _check), __privateGet(this, _state2));
    }
    hide() {
      __privateGet(this, _el).style.cursor = "none";
      __privateGet(this, _state2).hidden = true;
    }
    show() {
      __privateGet(this, _el).style.removeProperty("cursor");
      __privateGet(this, _state2).hidden = false;
    }
  };
  _timeout = new WeakMap();
  _el = new WeakMap();
  _check = new WeakMap();
  _state2 = new WeakMap();
  var CursorAutohider = _CursorAutohider;
  var _arr2, _index4;
  var History = class extends EventTarget {
    constructor() {
      super(...arguments);
      __privateAdd(this, _arr2, []);
      __privateAdd(this, _index4, -1);
    }
    pushState(x3) {
      const last = __privateGet(this, _arr2)[__privateGet(this, _index4)];
      if (last === x3 || last?.fraction && last.fraction === x3.fraction) return;
      __privateGet(this, _arr2)[++__privateWrapper(this, _index4)._] = x3;
      __privateGet(this, _arr2).length = __privateGet(this, _index4) + 1;
      this.dispatchEvent(new Event("index-change"));
    }
    replaceState(x3) {
      const index = __privateGet(this, _index4);
      __privateGet(this, _arr2)[index] = x3;
    }
    back() {
      const index = __privateGet(this, _index4);
      if (index <= 0) return;
      const detail = { state: __privateGet(this, _arr2)[index - 1] };
      __privateSet(this, _index4, index - 1);
      this.dispatchEvent(new CustomEvent("popstate", { detail }));
      this.dispatchEvent(new Event("index-change"));
    }
    forward() {
      const index = __privateGet(this, _index4);
      if (index >= __privateGet(this, _arr2).length - 1) return;
      const detail = { state: __privateGet(this, _arr2)[index + 1] };
      __privateSet(this, _index4, index + 1);
      this.dispatchEvent(new CustomEvent("popstate", { detail }));
      this.dispatchEvent(new Event("index-change"));
    }
    get canGoBack() {
      return __privateGet(this, _index4) > 0;
    }
    get canGoForward() {
      return __privateGet(this, _index4) < __privateGet(this, _arr2).length - 1;
    }
    clear() {
      __privateSet(this, _arr2, []);
      __privateSet(this, _index4, -1);
    }
  };
  _arr2 = new WeakMap();
  _index4 = new WeakMap();
  var languageInfo = (lang) => {
    if (!lang) return {};
    const langStr = Array.isArray(lang) ? lang[0] : lang;
    try {
      const canonical = Intl.getCanonicalLocales(langStr)[0];
      const locale = new Intl.Locale(canonical);
      const isCJK = ["zh", "ja", "kr"].includes(locale.language);
      const direction = (locale.getTextInfo?.() ?? locale.textInfo)?.direction;
      return { canonical, locale, isCJK, direction };
    } catch (e3) {
      console.warn(e3);
      return {};
    }
  };
  var _root3, _sectionProgress, _tocProgress, _pageProgress, _searchResults, _cursorAutohider, _View_instances, emit_fn, onRelocate_fn, onLoad_fn, handleLinks_fn, getOverlayer_fn, createOverlayer_fn, searchSection_fn, searchBook_fn;
  var View2 = class extends HTMLElement {
    constructor() {
      super();
      __privateAdd(this, _View_instances);
      __privateAdd(this, _root3, this.attachShadow({ mode: "open" }));
      __privateAdd(this, _sectionProgress, null);
      __privateAdd(this, _tocProgress, null);
      __privateAdd(this, _pageProgress, null);
      __privateAdd(this, _searchResults, /* @__PURE__ */ new Map());
      __privateAdd(this, _cursorAutohider, new CursorAutohider(this, () => this.hasAttribute("autohide-cursor")));
      __publicField(this, "isFixedLayout", false);
      __publicField(this, "lastLocation", null);
      __publicField(this, "history", new History());
      __publicField(this, "book");
      __publicField(this, "renderer");
      __publicField(this, "language", {});
      __publicField(this, "tts", null);
      __publicField(this, "mediaOverlay", null);
      this.history.addEventListener("popstate", (e3) => {
        const resolved = this.resolveNavigation(e3.detail.state);
        if (resolved) this.renderer.goTo(resolved);
      });
    }
    async open(book) {
      if (typeof book === "string" || typeof book.arrayBuffer === "function" || book.isDirectory) book = await makeBook(book);
      this.book = book;
      this.language = languageInfo(this.book.metadata?.language);
      if (this.book.splitTOCHref && this.book.getTOCFragment) {
        const ids = this.book.sections.map((s3) => s3.id);
        __privateSet(this, _sectionProgress, new SectionProgress(this.book.sections, 1500, 1600));
        const splitHref = this.book.splitTOCHref.bind(this.book);
        const getFragment = this.book.getTOCFragment.bind(this.book);
        __privateSet(this, _tocProgress, new TOCProgress());
        await __privateGet(this, _tocProgress).init({
          toc: this.book.toc ?? [],
          ids,
          splitHref,
          getFragment
        });
        __privateSet(this, _pageProgress, new TOCProgress());
        await __privateGet(this, _pageProgress).init({
          toc: this.book.pageList ?? [],
          ids,
          splitHref,
          getFragment
        });
      }
      this.isFixedLayout = this.book.rendition?.layout === "pre-paginated";
      if (this.isFixedLayout) {
        await Promise.resolve().then(() => (init_fixed_layout(), fixed_layout_exports));
        this.renderer = document.createElement("foliate-fxl");
      } else {
        await Promise.resolve().then(() => (init_paginator(), paginator_exports));
        this.renderer = document.createElement("foliate-paginator");
      }
      this.renderer.setAttribute("exportparts", "head,foot,filter,container");
      this.renderer.addEventListener("load", (e3) => __privateMethod(this, _View_instances, onLoad_fn).call(this, e3.detail));
      this.renderer.addEventListener("relocate", (e3) => __privateMethod(this, _View_instances, onRelocate_fn).call(this, e3.detail));
      this.renderer.addEventListener("create-overlayer", (e3) => e3.detail.attach(__privateMethod(this, _View_instances, createOverlayer_fn).call(this, e3.detail)));
      this.renderer.open(this.book);
      __privateGet(this, _root3).append(this.renderer);
      if (this.book.sections.some((section) => section.mediaOverlay)) {
        const activeClass = this.book.media.activeClass;
        const playbackActiveClass = this.book.media.playbackActiveClass;
        this.mediaOverlay = this.book.getMediaOverlay();
        let lastActive;
        this.mediaOverlay.addEventListener("highlight", (e3) => {
          const resolved = this.resolveNavigation(e3.detail.text);
          if (!resolved) return;
          this.renderer.goTo(resolved).then(() => {
            const { doc } = this.renderer.getContents().find((x3) => x3.index === resolved.index);
            const el = resolved.anchor(doc);
            el.classList.add(activeClass);
            if (playbackActiveClass) el.ownerDocument.documentElement.classList.add(playbackActiveClass);
            lastActive = new WeakRef(el);
          });
        });
        this.mediaOverlay.addEventListener("unhighlight", () => {
          const el = lastActive?.deref();
          if (el) {
            el.classList.remove(activeClass);
            if (playbackActiveClass) el.ownerDocument.documentElement.classList.remove(playbackActiveClass);
          }
        });
      }
    }
    close() {
      this.renderer?.destroy();
      this.renderer?.remove();
      __privateSet(this, _sectionProgress, null);
      __privateSet(this, _tocProgress, null);
      __privateSet(this, _pageProgress, null);
      __privateSet(this, _searchResults, /* @__PURE__ */ new Map());
      this.lastLocation = null;
      this.history.clear();
      this.tts = null;
      this.mediaOverlay = null;
    }
    goToTextStart() {
      return this.goTo(this.book.landmarks?.find((m3) => m3.type.includes("bodymatter") || m3.type.includes("text"))?.href ?? this.book.sections.findIndex((s3) => s3.linear !== "no"));
    }
    async init({ lastLocation, showTextStart }) {
      const resolved = lastLocation ? this.resolveNavigation(lastLocation) : null;
      if (resolved) {
        await this.renderer.goTo(resolved);
        this.history.pushState(lastLocation);
      } else if (showTextStart) await this.goToTextStart();
      else {
        this.history.pushState(0);
        await this.next();
      }
    }
    async addAnnotation(annotation, remove) {
      const { value } = annotation;
      if (value.startsWith(SEARCH_PREFIX)) {
        const cfi = value.replace(SEARCH_PREFIX, "");
        const resolved2 = await this.resolveNavigation(cfi);
        if (!resolved2) return;
        const { index: index2, anchor: anchor2 } = resolved2;
        const obj2 = __privateMethod(this, _View_instances, getOverlayer_fn).call(this, index2);
        if (obj2) {
          const { overlayer, doc } = obj2;
          if (remove) {
            overlayer.remove(value);
            return;
          }
          try {
            const range = doc ? anchor2(doc) : anchor2;
            overlayer.add(value, range, Overlayer.outline);
          } catch (e3) {
            console.warn(\`Could not resolve annotation range for search: \${value}\`, e3);
          }
        }
        return;
      }
      const resolved = await this.resolveNavigation(value);
      if (!resolved) return;
      const { index, anchor } = resolved;
      const obj = __privateMethod(this, _View_instances, getOverlayer_fn).call(this, index);
      if (obj) {
        const { overlayer, doc } = obj;
        overlayer.remove(value);
        if (!remove) {
          try {
            const range = doc ? anchor(doc) : anchor;
            const draw = (func, opts) => overlayer.add(value, range, func, opts);
            __privateMethod(this, _View_instances, emit_fn).call(this, "draw-annotation", { draw, annotation, doc, range });
          } catch (e3) {
            console.warn(\`Could not resolve annotation range: \${value}\`, e3);
          }
        }
      }
      const label = __privateGet(this, _tocProgress)?.getProgress(index, void 0)?.label ?? "";
      return { index, label };
    }
    deleteAnnotation(annotation) {
      return this.addAnnotation(annotation, true);
    }
    async showAnnotation(annotation) {
      const { value } = annotation;
      const resolved = await this.goTo(value);
      if (resolved) {
        const { index, anchor } = resolved;
        const obj = __privateMethod(this, _View_instances, getOverlayer_fn).call(this, index);
        if (obj) {
          const { doc } = obj;
          const range = anchor(doc);
          __privateMethod(this, _View_instances, emit_fn).call(this, "show-annotation", { value, index, range });
        }
      }
    }
    getCFI(index, range) {
      const baseCFI = this.book.sections[index].cfi ?? fake.fromIndex(index);
      if (!range) return baseCFI;
      return joinIndir(baseCFI, fromRange(range));
    }
    resolveCFI(cfi) {
      if (this.book.resolveCFI)
        return this.book.resolveCFI(cfi);
      else {
        const parts = parse(cfi);
        const index = fake.toIndex((parts.parent ?? parts).shift());
        const anchor = (doc) => toRange(doc, parts);
        return { index, anchor };
      }
    }
    resolveNavigation(target) {
      try {
        if (typeof target === "number") return { index: target };
        if (typeof target.fraction === "number") {
          const [index, anchor] = __privateGet(this, _sectionProgress).getSection(target.fraction);
          return { index, anchor };
        }
        if (isCFI.test(target)) return this.resolveCFI(target);
        return this.book.resolveHref?.(target);
      } catch (e3) {
        console.error(e3);
        console.error(\`Could not resolve target \${target}\`);
      }
    }
    async goTo(target) {
      const resolved = this.resolveNavigation(target);
      try {
        await this.renderer.goTo(resolved);
        this.history.pushState(target);
        return resolved;
      } catch (e3) {
        console.error(e3);
        console.error(\`Could not go to \${target}\`);
      }
    }
    async goToFraction(frac) {
      const [index, anchor] = __privateGet(this, _sectionProgress).getSection(frac);
      await this.renderer.goTo({ index, anchor });
      this.history.pushState({ fraction: frac });
    }
    async select(target) {
      try {
        const obj = this.resolveNavigation(target);
        await this.renderer.goTo({ ...obj, select: true });
        this.history.pushState(target);
      } catch (e3) {
        console.error(e3);
        console.error(\`Could not go to \${target}\`);
      }
    }
    deselect() {
      for (const { doc } of this.renderer.getContents())
        doc.defaultView?.getSelection()?.removeAllRanges();
    }
    getSectionFractions() {
      return (__privateGet(this, _sectionProgress)?.sectionFractions ?? []).map((x3) => x3 + Number.EPSILON);
    }
    getProgressOf(index, range) {
      const tocItem = __privateGet(this, _tocProgress)?.getProgress(index, range);
      const pageItem = __privateGet(this, _pageProgress)?.getProgress(index, range);
      return { tocItem, pageItem };
    }
    async getTOCItemOf(target) {
      try {
        const resolved = await this.resolveNavigation(target);
        if (!resolved) return;
        const { index, anchor } = resolved;
        const doc = await this.book.sections[index].createDocument();
        const frag = anchor(doc);
        const isRange = frag instanceof Range;
        const range = isRange ? frag : doc.createRange();
        if (!isRange) range.selectNodeContents(frag);
        return __privateGet(this, _tocProgress)?.getProgress(index, range);
      } catch (e3) {
        console.error(e3);
        console.error(\`Could not get \${target}\`);
      }
    }
    async prev(distance) {
      await this.renderer.prev(distance);
    }
    async next(distance) {
      await this.renderer.next(distance);
    }
    goLeft() {
      return this.book.dir === "rtl" ? this.next() : this.prev();
    }
    goRight() {
      return this.book.dir === "rtl" ? this.prev() : this.next();
    }
    async *search(opts) {
      this.clearSearch();
      const { searchMatcher: searchMatcher2 } = await Promise.resolve().then(() => (init_search(), search_exports));
      const { query, index } = opts;
      const matcher = searchMatcher2(
        textWalker,
        { defaultLocale: this.language, ...opts }
      );
      const iter = index != null ? __privateMethod(this, _View_instances, searchSection_fn).call(this, matcher, query, index) : __privateMethod(this, _View_instances, searchBook_fn).call(this, matcher, query);
      const list = [];
      __privateGet(this, _searchResults).set(index, list);
      for await (const result of iter) {
        if (result.subitems) {
          const resultWithSubs = result;
          const subList = resultWithSubs.subitems.map(({ cfi }) => ({ value: SEARCH_PREFIX + cfi }));
          __privateGet(this, _searchResults).set(resultWithSubs.index, subList);
          for (const item of subList) this.addAnnotation(item);
          yield {
            label: __privateGet(this, _tocProgress)?.getProgress(resultWithSubs.index, void 0)?.label ?? "",
            subitems: resultWithSubs.subitems
          };
        } else {
          const r3 = result;
          if (r3.cfi) {
            const item = { value: SEARCH_PREFIX + r3.cfi };
            list.push(item);
            this.addAnnotation(item);
          }
          yield result;
        }
      }
      yield "done";
    }
    clearSearch() {
      for (const list of __privateGet(this, _searchResults).values())
        for (const item of list) this.deleteAnnotation(item);
      __privateGet(this, _searchResults).clear();
    }
    async initTTS(granularity = "word") {
      const doc = this.renderer.getContents()[0].doc;
      if (this.tts && this.tts.doc === doc) return;
      const { TTS: TTS2 } = await Promise.resolve().then(() => (init_tts(), tts_exports));
      this.tts = new TTS2(doc, textWalker, (range) => this.renderer.scrollToAnchor(range, true), granularity);
    }
    startMediaOverlay() {
      const { index } = this.renderer.getContents()[0];
      return this.mediaOverlay.start(index);
    }
  };
  _root3 = new WeakMap();
  _sectionProgress = new WeakMap();
  _tocProgress = new WeakMap();
  _pageProgress = new WeakMap();
  _searchResults = new WeakMap();
  _cursorAutohider = new WeakMap();
  _View_instances = new WeakSet();
  emit_fn = function(name, detail, cancelable) {
    return this.dispatchEvent(new CustomEvent(name, { detail, cancelable }));
  };
  onRelocate_fn = function({ reason, range, index, fraction, size }) {
    const progress = __privateGet(this, _sectionProgress)?.getProgress(index, fraction, size) ?? {};
    const tocItem = __privateGet(this, _tocProgress)?.getProgress(index, range);
    const pageItem = __privateGet(this, _pageProgress)?.getProgress(index, range);
    const cfi = this.getCFI(index, range);
    this.lastLocation = { ...progress, tocItem, pageItem, cfi, range };
    if (reason === "snap" || reason === "page" || reason === "scroll")
      this.history.replaceState(cfi);
    __privateMethod(this, _View_instances, emit_fn).call(this, "relocate", this.lastLocation);
  };
  onLoad_fn = function({ doc, index }) {
    var _a, _b;
    try {
      (_a = doc.documentElement).lang || (_a.lang = this.language.canonical ?? "");
      if (!this.language.isCJK)
        (_b = doc.documentElement).dir || (_b.dir = this.language.direction ?? "");
      __privateMethod(this, _View_instances, handleLinks_fn).call(this, doc, index);
      __privateGet(this, _cursorAutohider).cloneFor(doc.documentElement);
    } catch (e3) {
      console.error(e3);
    }
    __privateMethod(this, _View_instances, emit_fn).call(this, "load", { doc, index });
  };
  handleLinks_fn = function(doc, index) {
    const { book } = this;
    const section = book.sections[index];
    doc.addEventListener("click", (e3) => {
      const a3 = e3.target.closest("a[href]");
      if (!a3) return;
      e3.preventDefault();
      const href_ = a3.getAttribute("href");
      const href = section?.resolveHref?.(href_) ?? href_;
      if (book?.isExternal?.(href))
        Promise.resolve(__privateMethod(this, _View_instances, emit_fn).call(this, "external-link", { a: a3, href }, true)).then((x3) => x3 ? globalThis.open(href, "_blank") : null).catch((e4) => console.error(e4));
      else Promise.resolve(__privateMethod(this, _View_instances, emit_fn).call(this, "link", { a: a3, href }, true)).then((x3) => x3 ? this.goTo(href) : null).catch((e4) => console.error(e4));
    });
  };
  getOverlayer_fn = function(index) {
    return this.renderer.getContents().find((x3) => x3.index === index && x3.overlayer);
  };
  createOverlayer_fn = function({ doc, index }) {
    const overlayer = new Overlayer(doc);
    doc.addEventListener("click", (e3) => {
      const [value, range] = overlayer.hitTest(e3);
      if (value && !value.startsWith(SEARCH_PREFIX)) {
        __privateMethod(this, _View_instances, emit_fn).call(this, "show-annotation", { value, index, range });
      }
    }, false);
    const list = __privateGet(this, _searchResults).get(index);
    if (list) for (const item of list) this.addAnnotation(item);
    __privateMethod(this, _View_instances, emit_fn).call(this, "create-overlay", { index });
    return overlayer;
  };
  searchSection_fn = async function* (matcher, query, index) {
    const doc = await this.book.sections[index].createDocument();
    for (const { range, excerpt } of matcher(doc, query))
      yield { cfi: this.getCFI(index, range), excerpt };
  };
  searchBook_fn = async function* (matcher, query) {
    const { sections } = this.book;
    for (const [index, { createDocument }] of sections.entries()) {
      if (!createDocument) continue;
      const doc = await createDocument();
      const subitems = Array.from(matcher(doc, query), ({ range, excerpt }) => ({ cfi: this.getCFI(index, range), excerpt }));
      const progress = (index + 1) / sections.length;
      yield { progress };
      if (subitems.length) yield { index, subitems };
    }
  };
  customElements.define("foliate-view", View2);
  return __toCommonJS(view_exports);
})();
`;

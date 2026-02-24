// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/extend-expect';

// Mock matchmedia
window.matchMedia = window.matchMedia || function() {
  return {
      matches: false,
      addListener: function() {},
      removeListener: function() {}
  };
};

// Mock DOMMatrix for pdfjs-dist (required for tests)
global.DOMMatrix = class DOMMatrix {
  constructor() {}
  multiply() { return this; }
  translate() { return this; }
  scale() { return this; }
  inverse() { return this; }
  transformPoint() { return this; }
  toJSON() { return {}; }
} as any;

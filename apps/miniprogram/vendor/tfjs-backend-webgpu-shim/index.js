/**
 * WeChat npm 会把 pose-detection 声明的 outsideDeps 一并 require。
 * Spike 只用 cpu/webgl，不需要真实 WebGPU backend。
 */
module.exports = {};

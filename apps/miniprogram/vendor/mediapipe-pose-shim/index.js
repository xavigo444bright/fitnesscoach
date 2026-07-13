/**
 * WeChat npm 构建会把 pose-detection 的 BlazePose 依赖一并打进包，
 * 导致 require('@mediapipe/pose')。MoveNet 路径不会真正调用这里。
 */
function Pose() {
  throw new Error('@mediapipe/pose shim: BlazePose 未在本 Spike 启用，请使用 MoveNet');
}

Pose.prototype.setOptions = function setOptions() {};
Pose.prototype.onResults = function onResults() {};
Pose.prototype.initialize = function initialize() {
  return Promise.resolve();
};
Pose.prototype.send = function send() {
  return Promise.resolve();
};
Pose.prototype.close = function close() {};
Pose.prototype.reset = function reset() {};

module.exports = {
  Pose,
  VERSION: '0.0.0-shim',
};

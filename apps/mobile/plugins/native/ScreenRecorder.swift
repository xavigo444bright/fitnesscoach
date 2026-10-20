import Foundation
import Photos
import ReplayKit

/// 调试页整屏录制。只收 App 内教练语音，不打开麦克风。
@objc(ScreenRecorder)
class ScreenRecorder: NSObject {
  private var stopping = false

  @objc static func requiresMainQueueSetup() -> Bool { true }

  @objc(start:rejecter:)
  func start(
    _ resolve: @escaping (Any?) -> Void,
    rejecter reject: @escaping (String?, String?, Error?) -> Void
  ) {
    let recorder = RPScreenRecorder.shared()
    guard recorder.isAvailable, !recorder.isRecording else {
      reject("unavailable", "录屏现在不可用", nil)
      return
    }
    PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
      DispatchQueue.main.async {
        guard status == .authorized || status == .limited else {
          reject("photos", "没有相册权限", nil)
          return
        }
        recorder.isMicrophoneEnabled = false
        recorder.startRecording { error in
          if let error {
            reject("start", error.localizedDescription, error)
            return
          }
          resolve(true)
        }
      }
    }
  }

  @objc(stop:rejecter:)
  func stop(
    _ resolve: @escaping (Any?) -> Void,
    rejecter reject: @escaping (String?, String?, Error?) -> Void
  ) {
    let recorder = RPScreenRecorder.shared()
    guard recorder.isRecording else {
      resolve("idle")
      return
    }
    if stopping {
      resolve("idle")
      return
    }
    stopping = true
    let url = FileManager.default.temporaryDirectory
      .appendingPathComponent("fc-debug-\(UUID().uuidString).mp4")
    recorder.stopRecording(withOutput: url) { error in
      self.stopping = false
      if let error {
        try? FileManager.default.removeItem(at: url)
        reject("stop", error.localizedDescription, error)
        return
      }
      self.save(url, resolve: resolve)
    }
  }

  private func save(_ url: URL, resolve: @escaping (Any?) -> Void) {
    PHPhotoLibrary.shared().performChanges({
      PHAssetChangeRequest.creationRequestForAssetFromVideo(atFileURL: url)
    }) { ok, _ in
      try? FileManager.default.removeItem(at: url)
      resolve(ok ? "saved" : "failed")
    }
  }
}

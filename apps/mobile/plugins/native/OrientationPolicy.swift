import UIKit

@objc(OrientationPolicy)
class OrientationPolicy: NSObject {
  @objc static var mask: UIInterfaceOrientationMask = .portrait

  @objc static func requiresMainQueueSetup() -> Bool { true }

  @objc(lock:)
  func lock(_ mode: String) {
    OrientationPolicy.mask = mode == "all" ? .allButUpsideDown : .portrait
    DispatchQueue.main.async {
      OrientationPolicy.apply()
    }
  }

  @objc static func apply() {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    for scene in scenes {
      if #available(iOS 16.0, *) {
        scene.windows.first?.rootViewController?.setNeedsUpdateOfSupportedInterfaceOrientations()
        let prefs = UIWindowScene.GeometryPreferences.iOS(interfaceOrientations: mask)
        scene.requestGeometryUpdate(prefs) { _ in }
      }
    }
    UIViewController.attemptRotationToDeviceOrientation()
  }
}

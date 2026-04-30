import ExpoModulesCore
import UIKit

/// View whose background is set via `UIColor(displayP3Red:green:blue:alpha:)`.
/// On a Display-P3 capable screen UIKit preserves the wide-gamut tag through
/// to CALayer; on older displays iOS gamut-maps to sRGB automatically.
class P3SwatchView: ExpoView {
  var rValue: Double = 0
  var gValue: Double = 0
  var bValue: Double = 0
  var aValue: Double = 1

  func apply() {
    backgroundColor = UIColor(
      displayP3Red: CGFloat(rValue),
      green: CGFloat(gValue),
      blue: CGFloat(bValue),
      alpha: CGFloat(aValue)
    )
  }
}

public class P3ColorModule: Module {
  public func definition() -> ModuleDefinition {
    Name("P3Color")

    View(P3SwatchView.self) {
      Prop("r") { (view: P3SwatchView, value: Double) in
        view.rValue = value
        view.apply()
      }
      Prop("g") { (view: P3SwatchView, value: Double) in
        view.gValue = value
        view.apply()
      }
      Prop("b") { (view: P3SwatchView, value: Double) in
        view.bValue = value
        view.apply()
      }
      Prop("a") { (view: P3SwatchView, value: Double) in
        view.aValue = value
        view.apply()
      }
    }
  }
}

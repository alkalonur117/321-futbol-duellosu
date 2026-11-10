import SwiftUI
import WebKit
import UIKit

struct GameWebView: UIViewRepresentable {
    @ObservedObject var model: GameViewModel

    func makeCoordinator() -> Coordinator {
        Coordinator(model: model)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.websiteDataStore = .default()
        configuration.userContentController.add(context.coordinator, name: "gameHaptics")

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 7/255, green: 16/255, blue: 24/255, alpha: 1)
        webView.scrollView.backgroundColor = webView.backgroundColor
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = false
        webView.allowsBackForwardNavigationGestures = false
        model.webView = webView
        webView.load(URLRequest(url: GameConfig.url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 30))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        // WebSocket and the current match stay alive across SwiftUI view updates.
    }

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "gameHaptics")
        uiView.navigationDelegate = nil
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        private let model: GameViewModel

        init(model: GameViewModel) {
            self.model = model
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            model.isLoading = true
            model.hasConnectionIssue = false
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            model.isLoading = false
            model.hasConnectionIssue = false
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            model.isLoading = false
            model.hasConnectionIssue = true
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            model.isLoading = false
            model.hasConnectionIssue = true
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }
            if url.scheme == "about" || (url.scheme == "https" && url.host == GameConfig.host) {
                decisionHandler(.allow)
                return
            }
            decisionHandler(.cancel)
            if let scheme = url.scheme, scheme == "https" || scheme == "http" {
                UIApplication.shared.open(url)
            }
        }

        func userContentController(_ userContentController: WKUserContentController,
                                   didReceive message: WKScriptMessage) {
            guard message.name == "gameHaptics",
                  message.webView?.url?.host == GameConfig.host,
                  let kind = message.body as? String else { return }
            switch kind {
            case "goal":
                UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
            case "opponentGoal":
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            case "wrong":
                UINotificationFeedbackGenerator().notificationOccurred(.error)
            case "warning":
                UINotificationFeedbackGenerator().notificationOccurred(.warning)
            default:
                break
            }
        }
    }
}

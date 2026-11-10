import SwiftUI
import WebKit

enum GameConfig {
    static let host = "three21-futbol-duellosu.onrender.com"
    static let url = URL(string: "https://three21-futbol-duellosu.onrender.com/?ios=1")!
    static let shareURL = URL(string: "https://three21-futbol-duellosu.onrender.com/")!
}

@MainActor
final class GameViewModel: ObservableObject {
    @Published var isLoading = true
    @Published var hasConnectionIssue = false
    weak var webView: WKWebView?

    func reload() {
        hasConnectionIssue = false
        if let webView {
            webView.reload()
        }
    }
}

struct GameScreen: View {
    @StateObject private var model = GameViewModel()
    private let background = Color(red: 7/255, green: 16/255, blue: 24/255)

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                Text("3·2·1")
                    .font(.system(size: 24, weight: .black, design: .rounded))
                    .foregroundStyle(Color(red: 184/255, green: 246/255, blue: 106/255))
                Text("FUTBOL")
                    .font(.system(size: 16, weight: .heavy, design: .rounded))
                    .foregroundStyle(.white)
                Spacer()
                if model.isLoading {
                    ProgressView()
                        .tint(.green)
                        .accessibilityLabel("Oyun yükleniyor")
                }
                ShareLink(item: GameConfig.shareURL) {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 19, weight: .semibold))
                        .frame(width: 40, height: 40)
                }
                .accessibilityLabel("Oyunu paylaş")
                Button(action: model.reload) {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 18, weight: .semibold))
                        .frame(width: 40, height: 40)
                }
                .accessibilityLabel("Oyunu yeniden yükle")
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 15)
            .frame(height: 49)
            .background(background)

            if model.hasConnectionIssue {
                HStack(spacing: 8) {
                    Image(systemName: "wifi.exclamationmark")
                    Text("Bağlantı kurulamadı. İnternetini kontrol et.")
                        .font(.footnote)
                    Spacer()
                    Button("Tekrar dene", action: model.reload)
                        .font(.footnote.bold())
                }
                .foregroundStyle(.white)
                .padding(10)
                .background(Color(red: 0.55, green: 0.16, blue: 0.19))
            }

            GameWebView(model: model)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(background.ignoresSafeArea())
    }
}

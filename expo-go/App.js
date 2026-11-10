import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Clipboard from 'expo-clipboard';

// The existing game, its rooms, accounts, scoreboard and WebSocket connection
// continue to run on the same Render server. No API keys are stored in this app.
const GAME_URL = 'https://three21-futbol-duellosu.onrender.com/';

const BRIDGE_SCRIPT = [
  '(function () {',
  '  if (!window.ReactNativeWebView) return;',
  '  var copy = function (value) {',
  '    window.ReactNativeWebView.postMessage(JSON.stringify({ type: "copy", text: String(value) }));',
  '    return Promise.resolve();',
  '  };',
  '  try {',
  '    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: copy } });',
  '  } catch (error) { /* The web app retains its normal copy fallback. */ }',
  '})();',
  'true;',
].join('\n');

export default function App() {
  const webview = useRef(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [failed, setFailed] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webview.current) {
        webview.current.goBack();
        return true;
      }
      return false;
    });
    return () => listener.remove();
  }, [canGoBack]);

  const retry = () => {
    setFailed(false);
    setReloadKey((value) => value + 1);
  };

  const handleMessage = async (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'copy' && typeof message.text === 'string') {
        await Clipboard.setStringAsync(message.text);
      }
    } catch (error) {
      // Invalid messages should not interrupt the match.
    }
  };

  const errorView = React.createElement(
    View,
    { style: styles.error },
    React.createElement(Text, { style: styles.title }, '3-2-1 FUTBOL'),
    React.createElement(
      Text,
      { style: styles.message },
      'Oyun sunucusuna bağlanılamadı. Bağlantını kontrol edip yeniden dene.'
    ),
    React.createElement(
      Pressable,
      { style: styles.retry, onPress: retry, accessibilityRole: 'button' },
      React.createElement(Text, { style: styles.retryText }, 'TEKRAR DENE')
    )
  );

  const gameView = React.createElement(WebView, {
    key: reloadKey,
    ref: webview,
    source: { uri: GAME_URL },
    originWhitelist: ['https://*'],
    javaScriptEnabled: true,
    domStorageEnabled: true,
    sharedCookiesEnabled: true,
    thirdPartyCookiesEnabled: true,
    allowsInlineMediaPlayback: true,
    mediaPlaybackRequiresUserAction: false,
    setSupportMultipleWindows: false,
    injectedJavaScript: BRIDGE_SCRIPT,
    onMessage: handleMessage,
    onError: () => setFailed(true),
    onNavigationStateChange: (state) => setCanGoBack(state.canGoBack),
    startInLoadingState: true,
    renderLoading: () =>
      React.createElement(
        View,
        { style: styles.loading },
        React.createElement(ActivityIndicator, { size: 'large', color: '#b9fa70' }),
        React.createElement(Text, { style: styles.loadingText }, 'SAHAYA BAĞLANILIYOR...')
      ),
    style: styles.webview,
  });

  return React.createElement(
    SafeAreaView,
    { style: styles.container },
    React.createElement(StatusBar, { barStyle: 'light-content', backgroundColor: '#071b17' }),
    failed ? errorView : gameView
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071b17',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  },
  webview: { flex: 1, backgroundColor: '#071b17' },
  loading: {
    flex: 1,
    backgroundColor: '#071b17',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#e5ffef',
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 16,
  },
  error: {
    flex: 1,
    padding: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#b9fa70', fontSize: 29, fontWeight: '900', marginBottom: 14 },
  message: {
    color: '#d4e7dc',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  retry: {
    backgroundColor: '#b9fa70',
    borderRadius: 12,
    paddingHorizontal: 26,
    paddingVertical: 15,
  },
  retryText: { color: '#071b17', fontWeight: '900' },
});

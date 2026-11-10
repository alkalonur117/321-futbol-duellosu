import { useCallback, useEffect, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'football_mobile_session_v1';
const DEFAULT_WS = 'wss://three21-futbol-duellosu.onrender.com';
const SERVER_URL = process.env.EXPO_PUBLIC_GAME_WS_URL || DEFAULT_WS;

export function useGameSocket() {
  const socketRef = useRef(null);
  const roundKeyRef = useRef('');
  const myIdRef = useRef(null);
  const [connection, setConnection] = useState('connecting');
  const [retry, setRetry] = useState(0);
  const [username, setUsername] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [myId, setMyId] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [game, setGame] = useState(null);
  const [notice, setNotice] = useState('');
  const [locked, setLocked] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [teamSuggestion, setTeamSuggestion] = useState(null);
  const [quizFeedback, setQuizFeedback] = useState(null);

  const send = useCallback((payload) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      setNotice('Sunucuya bağlı değiliz. Bağlantıyı yenileyin.');
      return false;
    }
    socketRef.current.send(JSON.stringify(payload));
    return true;
  }, []);

  useEffect(() => {
    let active = true;
    let ws;
    const connect = async () => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
      if (!active) return;
      ws = new WebSocket(SERVER_URL);
      socketRef.current = ws;
      setConnection('connecting');
      ws.onopen = () => {
        if (!active) return;
        setConnection('online');
        if (token) ws.send(JSON.stringify({ type: 'resume', token }));
      };
      ws.onerror = () => {
        if (active) setNotice('Bağlantı kurulamadı. İnternet ve Render durumunu kontrol edin.');
      };
      ws.onclose = () => {
        if (active && socketRef.current === ws) {
          setConnection('offline');
          setNotice('Sunucu bağlantısı kesildi. Yeniden bağlanınca maça tekrar katılmak gerekebilir.');
        }
      };
      ws.onmessage = (event) => {
        if (!active) return;
        let m;
        try { m = JSON.parse(event.data); } catch { return; }
        switch (m.type) {
          case 'authenticated':
            setUsername(m.username);
            setIsAdmin(Boolean(m.isAdmin));
            SecureStore.setItemAsync(TOKEN_KEY, m.token).catch(() => {});
            ws.send(JSON.stringify({ type: 'listRooms' }));
            setNotice('');
            break;
          case 'authError':
            setNotice(m.message || 'Oturum açılamadı.');
            setUsername(null);
            SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
            break;
          case 'rooms':
            setRooms(Array.isArray(m.rooms) ? m.rooms : []);
            break;
          case 'joined':
            myIdRef.current = m.id;
            setMyId(m.id);
            setRoomCode(m.code);
            setLocked(false);
            setNotice('Odaya katıldın.');
            break;
          case 'state': {
            const key = String(m.code) + ':' + String(m.matchSeq) + ':' +
              String(m.round) + ':' + String(m.deadline);
            if (roundKeyRef.current !== key) {
              roundKeyRef.current = key;
              setLocked(false);
              setSuggestion(null);
              setQuizFeedback(null);
              setTeamSuggestion(null);
            }
            setGame(m);
            setRoomCode(m.code);
            break;
          }
          case 'leftRoom':
            setGame(null);
            setRoomCode(null);
            setMyId(null);
            myIdRef.current = null;
            roundKeyRef.current = '';
            setLocked(false);
            setSuggestion(null);
            setQuizFeedback(null);
            setNotice(m.message || 'Odadan ayrıldın.');
            ws.send(JSON.stringify({ type: 'listRooms' }));
            break;
          case 'notice':
          case 'error':
          case 'selectionPenalty':
            setNotice(m.message || '');
            break;
          case 'suggestion':
            setSuggestion(m.name);
            break;
          case 'suggestionDismissed':
            setSuggestion(null);
            setLocked(false);
            break;
          case 'teamSelectionResult':
            if (m.result?.kind === 'suggest') {
              setTeamSuggestion(m.result.name);
              setNotice('Takım adını doğrula.');
            } else if (m.result?.kind === 'correct') {
              setTeamSuggestion(null);
              setNotice('Takım seçildi: ' + m.result.name);
            } else if (m.result?.kind === 'ambiguous') {
              setNotice('Birden fazla takım bulundu: ' + (m.result.options || []).join(', '));
            } else {
              setNotice('Takım bulunamadı. Farklı bir ad dene.');
            }
            break;
          case 'attempt':
            setLocked(true);
            if (!m.correct) setNotice('Yanlış cevap. Bu turda hakkın bitti.');
            break;
          case 'roundResult':
            setLocked(true);
            setSuggestion(null);
            setNotice((m.reason || 'Tur tamamlandı.') +
              (m.answers?.length ? ' · Örnek: ' + m.answers.slice(0, 3).join(', ') : ''));
            break;
          case 'quizAnswerFeedback':
            setLocked(true);
            setQuizFeedback(m);
            if (!m.isCorrect) setNotice('Doğru cevap: ' + m.correctAnswer);
            break;
          case 'quizResult':
            setLocked(true);
            setNotice((m.reason || 'Tur tamamlandı.') + ' · Doğru: ' + m.correct);
            break;
          case 'gameOver':
            setNotice(m.winnerId === myIdRef.current ? '🏆 Maçı kazandın!' : 'Maç sona erdi.');
            break;
          default:
            break;
        }
      };
    };
    connect();
    return () => {
      active = false;
      if (ws) ws.close();
      if (socketRef.current === ws) socketRef.current = null;
    };
  }, [retry]);

  const authenticate = useCallback((action, name, password) => {
    return send({ type: 'auth', action, username: name.trim(), password });
  }, [send]);

  const createRoom = useCallback((mode, opponent) => {
    const isBot = opponent.startsWith('bot-');
    return send({
      type: 'create', mode,
      solo: opponent === 'solo',
      opponent: isBot ? 'bot' : 'human',
      difficulty: isBot ? opponent.slice(4) : 'medium'
    });
  }, [send]);

  const answer = useCallback((value) => {
    if (!value.trim()) return;
    if (send({ type: 'answer', answer: value.trim() })) setLocked(true);
  }, [send]);

  const quizAnswer = useCallback((index) => {
    if (send({ type: 'quizAnswer', index })) setLocked(true);
  }, [send]);

  const confirmSuggestion = useCallback((accept) => {
    if (send({ type: 'confirmSuggestion', accept })) {
      setSuggestion(null);
      setLocked(Boolean(accept));
    }
  }, [send]);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    setUsername(null);
    setIsAdmin(false);
    setMyId(null);
    myIdRef.current = null;
    setRoomCode(null);
    setGame(null);
    setNotice('');
    setRetry(v => v + 1);
  }, []);

  return {
    connection, username, isAdmin, myId, roomCode, rooms, game, notice,
    locked, suggestion, teamSuggestion, quizFeedback, authenticate, createRoom,
    answer, quizAnswer, confirmSuggestion, logout, send,
    reconnect: () => setRetry(v => v + 1)
  };
}

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  Share, StyleSheet, Text, TextInput, View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useGameSocket } from './src/useGameSocket';

const C = {
  bg: '#071018', panel: '#101e2b', panel2: '#162838', border: '#284051',
  lime: '#b8f66a', white: '#f6fafc', muted: '#a6b8c3', blue: '#8ad7ff',
  red: '#ff8790', yellow: '#f8d88c'
};
const MODES = [
  { id: 'classic', icon: '⚡', name: 'Klasik 3-2-1', detail: 'İki takımın ortak futbolcusunu bul.' },
  { id: 'custom', icon: '🛡️', name: 'Takımları Sen Seç', detail: 'Takımını seç, rakibinle düello yap.' },
  { id: 'tictactoe', icon: '❎', name: 'Tic Tac Toe', detail: '9 kare, doğru oyuncu, üçlü sıra.' },
  { id: 'quiz', icon: '🏆', name: 'Futbol Bilgi Yarışması', detail: 'Dört seçenek, 15 saniye.' }
];
const OPPONENTS = [
  { id: 'human', label: 'Arkadaşla oyna' },
  { id: 'bot-easy', label: 'Yapay zekâ · Kolay' },
  { id: 'bot-medium', label: 'Yapay zekâ · Orta' },
  { id: 'bot-hard', label: 'Yapay zekâ · Zor' },
  { id: 'solo', label: 'Tek kişilik antrenman' }
];

function Button({ label, onPress, secondary, disabled, small, danger, style }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button, secondary && styles.secondaryButton, danger && styles.dangerButton,
        small && styles.smallButton, disabled && styles.disabled, pressed && styles.pressed, style
      ]}
    >
      <Text style={[styles.buttonText, secondary && styles.secondaryText, danger && styles.dangerText]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        style={styles.input}
        placeholderTextColor="#718797"
        selectionColor={C.lime}
        autoCorrect={false}
        {...props}
      />
    </View>
  );
}

function Panel({ children, style }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

function Choice({ label, active, onPress, style }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.choice, active && styles.choiceActive, style]}
    >
      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
    </Pressable>
  );
}

function AuthScreen({ client }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (client.notice) setBusy(false); }, [client.notice]);
  const submit = (action) => {
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(name.trim())) {
      Alert.alert('Kullanıcı adı', '3–20 harf, rakam veya alt çizgi kullan.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Şifre', 'Şifre en az 8 karakter olmalı.');
      return;
    }
    if (client.authenticate(action, name, password)) setBusy(true);
  };
  return (
    <Panel>
      <Text style={styles.eyebrow}>OYUNCU GİRİŞİ</Text>
      <Text style={styles.heading}>SAHAYA HOŞ GELDİN</Text>
      <Text style={styles.description}>Hesabınla giriş yap veya yeni bir oyuncu oluştur.</Text>
      <Field label="KULLANICI ADI" value={name} onChangeText={setName}
        autoCapitalize="none" autoComplete="username" maxLength={20}
        placeholder="Kullanıcı adın" />
      <Field label="ŞİFRE" value={password} onChangeText={setPassword}
        secureTextEntry autoCapitalize="none" autoComplete="password"
        placeholder="En az 8 karakter" onSubmitEditing={() => submit('login')} />
      <Button label={busy ? 'GİRİŞ YAPILIYOR...' : 'SAHAYA GİR'} disabled={busy || client.connection !== 'online'}
        onPress={() => submit('login')} />
      <Button label="YENİ HESAP OLUŞTUR" secondary disabled={busy || client.connection !== 'online'}
        onPress={() => submit('register')} />
    </Panel>
  );
}

function LobbyScreen({ client }) {
  const [mode, setMode] = useState('classic');
  const [opponent, setOpponent] = useState('human');
  const [joinCode, setJoinCode] = useState('');
  return (
    <View>
      <Panel>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>OYUN MERKEZİ</Text>
            <Text style={styles.heading}>MERHABA, {client.username?.toUpperCase()}</Text>
          </View>
          <Button label="ÇIKIŞ" secondary small onPress={() => client.logout()} />
        </View>
        <Text style={styles.sectionTitle}>OYUN MODUNU SEÇ</Text>
        {MODES.map(m => (
          <Pressable key={m.id} onPress={() => setMode(m.id)}
            style={[styles.modeCard, mode === m.id && styles.modeCardActive]}>
            <Text style={styles.modeIcon}>{m.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.modeTitle}>{m.name}</Text>
              <Text style={styles.modeDetail}>{m.detail}</Text>
            </View>
            <Text style={{ color: mode === m.id ? C.lime : C.muted }}>{mode === m.id ? '●' : '○'}</Text>
          </Pressable>
        ))}
        <Text style={styles.sectionTitle}>RAKİBİNİ BELİRLE</Text>
        <View style={styles.choiceWrap}>
          {OPPONENTS.filter(o => o.id !== 'solo' || mode !== 'classic').map(o => (
            <Choice key={o.id} label={o.label} active={opponent === o.id}
              onPress={() => setOpponent(o.id)} />
          ))}
        </View>
        <Button label="⚽  MAÇA BAŞLA / ODA OLUŞTUR"
          onPress={() => client.createRoom(mode, mode === 'classic' && opponent === 'solo' ? 'human' : opponent)} />
      </Panel>
      <Panel>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>AÇIK ODALAR</Text>
          <Button label="↻ YENİLE" secondary small onPress={() => client.send({ type: 'listRooms' })} />
        </View>
        {client.rooms.length === 0 ? (
          <Text style={styles.description}>Şu anda katılabileceğin açık oda yok.</Text>
        ) : client.rooms.map(room => (
          <View key={room.code} style={styles.roomRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modeTitle}>{room.host || 'Oyuncu'} · {room.code}</Text>
              <Text style={styles.modeDetail}>{MODES.find(m => m.id === room.mode)?.name || room.mode}</Text>
            </View>
            <Button label="KATIL" small onPress={() => client.send({ type: 'join', code: room.code })} />
          </View>
        ))}
      </Panel>
      <Panel>
        <Text style={styles.sectionTitle}>ODA KODUYLA KATIL</Text>
        <Field value={joinCode} onChangeText={setJoinCode} maxLength={6}
          autoCapitalize="characters" placeholder="Örn. AB12CD" />
        <Button label="KODLA KATIL" secondary
          onPress={() => client.send({ type: 'join', code: joinCode.trim().toUpperCase() })} />
      </Panel>
    </View>
  );
}

function Scoreboard({ game, myId }) {
  const first = game.players?.[0];
  const second = game.players?.[1];
  return (
    <View style={styles.scoreRow}>
      {[first, second].map((p, i) => (
        <View key={i} style={[styles.scoreBox, p?.id === myId && styles.myScore]}>
          <Text numberOfLines={1} style={styles.scoreName}>{p?.name || (i ? 'Rakip bekleniyor' : 'Oyuncu')}</Text>
          <Text style={styles.scoreNumber}>{p?.score ?? (game.solo && i ? '—' : 0)}</Text>
          <Text style={styles.scoreTag}>{p?.id === myId ? 'SEN' : i ? 'RAKİP' : 'OYUNCU'}</Text>
        </View>
      ))}
    </View>
  );
}

function GridGame({ client, game, selectedCell, setSelectedCell, gridAnswer, setGridAnswer }) {
  const myTurn = game.solo || game.players?.[game.turn]?.id === client.myId;
  const canPlay = game.phase === 'playing' && myTurn;
  return (
    <Panel>
      <Text style={styles.sectionTitle}>TIC TAC TOE</Text>
      <Text style={styles.description}>{game.phase === 'playing'
        ? (myTurn ? 'SIRA SENDE · Bir kare seç' : 'Rakibin hamlesi bekleniyor')
        : game.phase === 'finished' ? 'Oyun tamamlandı.' : 'Rakip bekleniyor.'}</Text>
      <View style={styles.gridBoard}>
        <View style={styles.gridRow}>
          <View style={styles.gridHeader} />
          {(game.cols || []).map((col, i) => (
            <View key={i} style={styles.gridHeader}><Text style={styles.gridLabel}>{col}</Text></View>
          ))}
        </View>
        {(game.rows || []).map((row, r) => (
          <View key={r} style={styles.gridRow}>
            <View style={styles.gridHeader}><Text style={styles.gridLabel}>{row}</Text></View>
            {[0, 1, 2].map(c => {
              const idx = r * 3 + c;
              const owner = game.board?.[idx];
              const mine = owner === client.myId;
              return (
                <Pressable key={idx} disabled={!canPlay || Boolean(owner)}
                  onPress={() => { setSelectedCell(idx); setGridAnswer(''); }}
                  style={[styles.gridCell, owner && (mine ? styles.gridMine : styles.gridOther),
                    selectedCell === idx && styles.gridSelected]}>
                  <Text style={styles.gridCellText} numberOfLines={3}>
                    {owner ? (game.boardNames?.[idx] || '✓') : '+'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      {selectedCell !== null && canPlay ? (
        <View>
          <Text style={styles.sectionTitle}>SEÇİLEN KARE</Text>
          <Text style={styles.description}>{game.rows?.[Math.floor(selectedCell / 3)]} + {game.cols?.[selectedCell % 3]}</Text>
          <Field value={gridAnswer} onChangeText={setGridAnswer} placeholder="Ortak futbolcunun adı"
            onSubmitEditing={() => {
              if (gridAnswer.trim()) {
                client.send({ type: 'gridAnswer', idx: selectedCell, answer: gridAnswer.trim() });
                setSelectedCell(null);
                setGridAnswer('');
              }
            }} />
          <Button label="KAREYİ DOLDUR" disabled={!gridAnswer.trim()}
            onPress={() => {
              client.send({ type: 'gridAnswer', idx: selectedCell, answer: gridAnswer.trim() });
              setSelectedCell(null);
              setGridAnswer('');
            }} />
        </View>
      ) : null}
    </Panel>
  );
}

function GameScreen({ client }) {
  const game = client.game;
  const [answer, setAnswer] = useState('');
  const [team, setTeam] = useState('');
  const [gridAnswer, setGridAnswer] = useState('');
  const [selectedCell, setSelectedCell] = useState(null);
  const [quizChoice, setQuizChoice] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setAnswer('');
    setGridAnswer('');
    setSelectedCell(null);
    setQuizChoice(null);
  }, [game?.round, game?.deadline]);
  useEffect(() => { setTeam(''); }, [game?.selectionDeadline]);

  if (!game) {
    return (
      <Panel>
        <Text style={styles.heading}>ODA HAZIRLANIYOR</Text>
        <ActivityIndicator color={C.lime} />
        <Button label="ODADAN AYRIL" secondary onPress={() => client.send({ type: 'leaveRoom' })} />
      </Panel>
    );
  }
  const mode = game.mode;
  const isDuel = mode === 'classic' || mode === 'custom';
  const timeOffset = game.serverTime && game.receivedAt ? game.serverTime - game.receivedAt : 0;
  const seconds = game.deadline ? Math.max(0, Math.ceil((game.deadline - now - timeOffset) / 1000)) : null;
  const playerIndex = game.players?.findIndex(p => p.id === client.myId) ?? -1;
  const selectionSlot = game.solo ? 0 : playerIndex;
  const ownTeam = game.selection?.[selectionSlot];
  const isPlaying = game.phase === 'playing';
  const canAnswer = isPlaying && !client.locked;
  const leave = () => Alert.alert('Maçtan ayrıl', 'Odadan ayrılmak istiyor musun?', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Ayrıl', style: 'destructive', onPress: () => client.send({ type: 'leaveRoom' }) }
  ]);
  const share = () => Share.share({
    message: 'Futbol düellosuna katıl: https://three21-futbol-duellosu.onrender.com/?room=' + game.code
  }).catch(() => {});

  return (
    <View>
      <Panel>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.eyebrow}>MAÇ ODASI</Text>
            <Text style={styles.heading}>{game.code}</Text>
          </View>
          <View style={styles.roomActions}>
            <Button label="PAYLAŞ" secondary small onPress={share} />
            <Button label="ÇIK" danger small onPress={leave} />
          </View>
        </View>
        <Text style={styles.description}>{MODES.find(m => m.id === mode)?.name} · {game.phase.toUpperCase()}</Text>
        <Scoreboard game={game} myId={client.myId} />
        {seconds !== null ? (
          <View style={styles.timerWrap}>
            <Text style={styles.eyebrow}>KALAN SÜRE</Text>
            <Text style={[styles.timer, seconds <= 5 && { color: C.red }]}>{String(seconds).padStart(2, '0')} sn</Text>
          </View>
        ) : null}
      </Panel>

      {game.phase === 'waiting' ? (
        <Panel>
          <Text style={styles.heading}>RAKİP BEKLENİYOR</Text>
          <Text style={styles.description}>Oda kodunu arkadaşınla paylaş. Katıldığında maç başlayacak.</Text>
          <Button label="DAVET BAĞLANTISINI PAYLAŞ" onPress={share} />
        </Panel>
      ) : null}

      {mode === 'custom' && game.phase === 'setup' ? (
        <Panel>
          <Text style={styles.eyebrow}>20 SANİYE · TAKIM SEÇİMİ</Text>
          <Text style={styles.heading}>TAKIMINI SEÇ</Text>
          {ownTeam ? (
            <Text style={styles.description}>Seçtiğin takım: {ownTeam}. Rakip bekleniyor.</Text>
          ) : (
            <>
              <Field value={team} onChangeText={setTeam} placeholder="Takım adı"
                onSubmitEditing={() => client.send({ type: 'selectTeam', name: team.trim() })} />
              <Button label="TAKIMI ONAYLA" disabled={!team.trim()}
                onPress={() => client.send({ type: 'selectTeam', name: team.trim() })} />
              {client.teamSuggestion ? (
                <Button secondary label={'BUNU MU DEMEK İSTEDİN? ' + client.teamSuggestion}
                  onPress={() => client.send({ type: 'selectTeam', name: client.teamSuggestion })} />
              ) : null}
            </>
          )}
        </Panel>
      ) : null}

      {isDuel && !(mode === 'custom' && game.phase === 'setup') && game.phase !== 'waiting' ? (
        <Panel>
          <Text style={styles.eyebrow}>TUR {game.round} · İLK DOĞRU CEVAP 1 PUAN</Text>
          <View style={styles.teamDuel}>
            <Text style={styles.teamName}>{game.teams?.[0] || '?'}</Text>
            <Text style={styles.vs}>VS</Text>
            <Text style={styles.teamName}>{game.teams?.[1] || '?'}</Text>
          </View>
          <Text style={styles.description}>Her iki takımda da oynamış futbolcuyu yaz.</Text>
          <Field value={answer} onChangeText={setAnswer} placeholder="Futbolcunun adı veya soyadı"
            editable={canAnswer} onSubmitEditing={() => { client.answer(answer); setAnswer(''); }} />
          <Button label="CEVABI GÖNDER" disabled={!canAnswer || !answer.trim()}
            onPress={() => { client.answer(answer); setAnswer(''); }} />
        </Panel>
      ) : null}

      {mode === 'quiz' && game.phase !== 'waiting' ? (
        <Panel>
          <Text style={styles.eyebrow}>TUR {game.round} · FUTBOL BİLGİ YARIŞMASI</Text>
          <Text style={styles.heading}>{game.quiz?.question || (game.phase === 'finished' ? 'MAÇ TAMAMLANDI' : 'SONUÇ BEKLENİYOR')}</Text>
          {(game.quiz?.options || []).map((option, index) => {
            const chosen = quizChoice === index;
            const isCorrect = client.quizFeedback?.correctIndex === index;
            return (
              <Pressable key={index} disabled={!canAnswer || quizChoice !== null}
                onPress={() => { setQuizChoice(index); client.quizAnswer(index); }}
                style={[styles.quizOption, chosen && styles.quizSelected,
                  client.quizFeedback && isCorrect && styles.quizCorrect]}>
                <Text style={styles.quizOptionText}>{String.fromCharCode(65 + index)}.  {option}</Text>
              </Pressable>
            );
          })}
          {client.quizFeedback ? (
            <Text style={[styles.description, { color: client.quizFeedback.isCorrect ? C.lime : C.red }]}>
              {client.quizFeedback.isCorrect ? 'Doğru cevap!' : 'Doğru cevap: ' + client.quizFeedback.correctAnswer}
            </Text>
          ) : null}
        </Panel>
      ) : null}

      {mode === 'tictactoe' && game.phase !== 'waiting' ? (
        <GridGame client={client} game={game} selectedCell={selectedCell}
          setSelectedCell={setSelectedCell} gridAnswer={gridAnswer} setGridAnswer={setGridAnswer} />
      ) : null}

      {game.recentAttempts?.length ? (
        <Panel>
          <Text style={styles.sectionTitle}>SON CEVAPLAR</Text>
          {game.recentAttempts.slice(-5).reverse().map((a, i) => (
            <Text key={String(a.id || i)} style={styles.attempt}>
              {a.correct ? '✓' : '✕'} {a.playerName || a.name || 'Oyuncu'}: {a.answer || '—'}
            </Text>
          ))}
        </Panel>
      ) : null}

      {game.phase === 'finished' ? (
        <Panel>
          <Text style={styles.heading}>MAÇ TAMAMLANDI</Text>
          <Button label="↻ RÖVANŞ" onPress={() => client.send({ type: 'rematch' })} />
          <Button label="LOBIYE DÖN" secondary onPress={leave} />
        </Panel>
      ) : null}

      {client.suggestion ? (
        <Panel style={styles.suggestionPanel}>
          <Text style={styles.sectionTitle}>BUNU MU DEMEK İSTEDİN?</Text>
          <Text style={styles.heading}>{client.suggestion}</Text>
          <View style={styles.row}>
            <Button label="EVET" style={{ flex: 1 }} onPress={() => client.confirmSuggestion(true)} />
            <Button label="HAYIR" style={{ flex: 1 }} secondary onPress={() => client.confirmSuggestion(false)} />
          </View>
        </Panel>
      ) : null}
    </View>
  );
}

export default function App() {
  const client = useGameSocket();
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
            <View style={styles.header}>
              <View style={styles.brand}>
                <Text style={styles.brandBall}>⚽</Text>
                <View>
                  <Text style={styles.brandText}>FUTBOL DÜELLOSU</Text>
                  <Text style={styles.brandSub}>MOBİL TEST SÜRÜMÜ</Text>
                </View>
              </View>
              <Pressable onPress={client.reconnect} accessibilityRole="button" accessibilityLabel="Bağlantıyı yenile">
                <Text style={[styles.connection, client.connection === 'online' && styles.connectionOnline]}>
                  {client.connection === 'online' ? '● CANLI' : '↻ YENİLE'}
                </Text>
              </Pressable>
            </View>
            {client.notice ? (
              <View style={styles.notice}><Text style={styles.noticeText}>{client.notice}</Text></View>
            ) : null}
            {client.connection === 'connecting' ? (
              <Panel><ActivityIndicator color={C.lime} /><Text style={styles.description}>Sunucuya bağlanılıyor...</Text></Panel>
            ) : null}
            {client.connection === 'offline' ? (
              <Panel>
                <Text style={styles.heading}>BAĞLANTI KESİLDİ</Text>
                <Button label="TEKRAR BAĞLAN" onPress={client.reconnect} />
              </Panel>
            ) : client.username
              ? (client.roomCode ? <GameScreen client={client} /> : <LobbyScreen client={client} />)
              : <AuthScreen client={client} />}
            <Text style={styles.footer}>Native Android + iOS · Render oyun sunucusu</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { paddingHorizontal: 15, paddingBottom: 40, paddingTop: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandBall: { fontSize: 31 },
  brandText: { fontSize: 18, color: C.white, fontWeight: '900', letterSpacing: 0.4 },
  brandSub: { color: C.lime, fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  connection: { color: C.red, fontSize: 11, fontWeight: '800', padding: 8 },
  connectionOnline: { color: C.lime },
  panel: { backgroundColor: C.panel, borderColor: C.border, borderWidth: 1, borderRadius: 17, padding: 16, marginBottom: 13, gap: 11 },
  eyebrow: { color: C.lime, fontSize: 10, fontWeight: '900', letterSpacing: 1.7 },
  heading: { color: C.white, fontSize: 22, fontWeight: '900', letterSpacing: 0.2 },
  description: { color: C.muted, fontSize: 13, lineHeight: 20 },
  sectionTitle: { color: C.white, fontSize: 13, fontWeight: '900', marginTop: 5, letterSpacing: 0.5 },
  field: { gap: 6 },
  fieldLabel: { color: C.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  input: { backgroundColor: C.bg, color: C.white, borderColor: C.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 13, fontSize: 16 },
  button: { backgroundColor: C.lime, paddingVertical: 13, paddingHorizontal: 13, borderRadius: 11, alignItems: 'center', justifyContent: 'center', minHeight: 46 },
  buttonText: { color: '#10200c', fontWeight: '900', fontSize: 12, letterSpacing: 0.4, textAlign: 'center' },
  secondaryButton: { backgroundColor: C.panel2, borderWidth: 1, borderColor: C.border },
  secondaryText: { color: C.white },
  dangerButton: { backgroundColor: '#48252d' },
  dangerText: { color: '#ffd5d8' },
  smallButton: { minHeight: 35, paddingVertical: 8, paddingHorizontal: 11 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.78 },
  row: { flexDirection: 'row', gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  modeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12 },
  modeCardActive: { borderColor: C.lime, backgroundColor: '#213629' },
  modeIcon: { fontSize: 25 },
  modeTitle: { color: C.white, fontSize: 14, fontWeight: '800' },
  modeDetail: { color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { paddingHorizontal: 11, paddingVertical: 10, borderRadius: 10, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.border },
  choiceActive: { backgroundColor: '#29402a', borderColor: C.lime },
  choiceText: { color: C.muted, fontSize: 12, fontWeight: '700' },
  choiceTextActive: { color: C.lime },
  roomRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderColor: C.border, paddingTop: 10 },
  roomActions: { flexDirection: 'row', gap: 6 },
  scoreRow: { flexDirection: 'row', gap: 9, marginTop: 4 },
  scoreBox: { flex: 1, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, alignItems: 'center' },
  myScore: { borderColor: C.lime },
  scoreName: { color: C.white, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  scoreNumber: { color: C.lime, fontSize: 34, fontWeight: '900' },
  scoreTag: { color: C.muted, fontSize: 9, fontWeight: '800' },
  timerWrap: { alignItems: 'center', paddingTop: 4 },
  timer: { color: C.lime, fontSize: 29, fontWeight: '900' },
  teamDuel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 10 },
  teamName: { flex: 1, color: C.white, fontSize: 16, fontWeight: '900', textAlign: 'center', backgroundColor: C.panel2, padding: 11, borderRadius: 11 },
  vs: { color: C.lime, fontWeight: '900' },
  quizOption: { backgroundColor: C.panel2, borderColor: C.border, borderWidth: 1, borderRadius: 11, padding: 14 },
  quizSelected: { borderColor: C.blue },
  quizCorrect: { borderColor: C.lime, backgroundColor: '#1c3c27' },
  quizOptionText: { color: C.white, fontSize: 14, fontWeight: '700' },
  gridBoard: { gap: 4, marginVertical: 10 },
  gridRow: { flexDirection: 'row', gap: 4 },
  gridHeader: { flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', backgroundColor: C.panel2, borderRadius: 6, padding: 3 },
  gridLabel: { color: C.white, fontSize: 9, fontWeight: '800', textAlign: 'center' },
  gridCell: { flex: 1, aspectRatio: 1, minHeight: 63, justifyContent: 'center', alignItems: 'center', backgroundColor: C.panel2, borderRadius: 7, padding: 3 },
  gridMine: { backgroundColor: '#2d4d2e' },
  gridOther: { backgroundColor: '#3a3455' },
  gridSelected: { borderWidth: 2, borderColor: C.lime },
  gridCellText: { color: C.white, fontSize: 10, fontWeight: '800', textAlign: 'center' },
  attempt: { color: C.muted, fontSize: 12, paddingVertical: 2 },
  suggestionPanel: { borderColor: C.lime },
  notice: { backgroundColor: '#24333d', borderLeftWidth: 3, borderColor: C.lime, borderRadius: 8, padding: 12, marginBottom: 12 },
  noticeText: { color: C.white, fontSize: 12, lineHeight: 18 },
  footer: { color: '#647987', fontSize: 10, textAlign: 'center', marginTop: 6 }
});

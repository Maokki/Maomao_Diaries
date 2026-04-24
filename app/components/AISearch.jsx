// app/components/AISearch.jsx
import {
  StyleSheet,
  Image,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { useState, useRef } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const EXAMPLE_QUERIES = [
  'When did I go out?',
  'What made me happy recently?',
  'How did I able to fight the recent challenges?',
  'What did I do last weekend?',
];

export default function AISearch({ sections = [] }) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  const openModal = () => {
    setVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    setVisible(false);
    setError(null);
  };

  const buildDiaryContext = async () => {
    const parts = [];
    const activeSections = sections.length > 0 ? sections : ['Personal', 'Work', 'Health', 'Travel'];
    
    for (const section of activeSections) {
      const raw = await AsyncStorage.getItem(`@diary_items_${section}`);
      if (!raw) continue;
      const items = JSON.parse(raw);
      if (!items.length) continue;
      parts.push(`=== Section: "${section}" ===`);
      items.forEach(item => {
        parts.push(`[Date: ${item.createdAt || item.lastModified}] Entry: ${item.text}`);
      });
    }
    return parts.join('\n');
  };

  const handleSend = async () => {
    console.log("Current API Key check:", GEMINI_API_KEY ? "Key exists" : "Key is MISSING");
    if (!query.trim() || loading) return;

    // CHECK FOR INTERNET FIRST
    const state = await NetInfo.fetch();
    
    if (state.isConnected === false) {
      setError("Maomao is out gathering herbs and has no signal. Please check your connection.");
      setMessages(prev => [...prev, { role: 'user', text: query.trim() }]);
      setQuery(''); 
      return;
    }

    const userText = query.trim();
    setQuery('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setLoading(true);

    try {
      if (!GEMINI_API_KEY) throw new Error("API Key missing in .env");

      const diaryContext = await buildDiaryContext();
      if (!diaryContext.trim()) {
        setMessages(prev => [...prev, { role: 'ai', text: "Your scrolls are empty! Write something first. 🌿" }]);
        setLoading(false);
        return;
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ 
            text: `Context from user diary:\n${diaryContext}\n\nQuestion: ${userText}\n\nInstructions: Answer using only the diary context. Be helpful and mention specific dates.` 
          }]
        }]
      }),
    });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "I cannot read that.";
      setMessages(prev => [...prev, { role: 'ai', text: aiText }]);
    } catch (e) {
      const errorMsg = e.message || "";
      
      if (errorMsg.includes("quota") || errorMsg.includes("429")) {
        setError("Maomao is overwhelmed with tasks right now because of that Jinshi-t! Please wait a moment before asking another question.");
      } else if (errorMsg.includes("Network request failed")) {
        setError("The connection was lost. Maomao cannot work with you right now.");
      } else {
        setError("Diary checking error occurred. Please try again in a moment.");
      }
    } finally {
      setLoading(false);
      // In Top-Input mode, scroll to the top to see the newest AI response immediately
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 150);
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.fab} onPress={openModal} activeOpacity={0.85}>
        <Ionicons name="sparkles" size={24} color="white" />
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" onRequestClose={closeModal}>
        <View style={styles.container}>
          {/* 1. Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="flask" size={20} color="#6B8E4E" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Apothecary Search</Text>
                <Text style={styles.headerSub}>AI Insights</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              {messages.length > 0 && (
                <TouchableOpacity style={styles.headerBtn} onPress={() => setMessages([])}>
                  <Ionicons name="trash-outline" size={18} color="#C85C5C" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.headerBtn} onPress={closeModal}>
                <Ionicons name="close" size={20} color="#4A403A" />
              </TouchableOpacity>
            </View>
          </View>

          {/* 2. Input Bar */}
          <View style={styles.topInputBar}>
            <View style={styles.inputWrapper}>
              <Ionicons name="search-outline" size={18} color="#8B8680" style={styles.searchInnerIcon} />
              <TextInput
                style={styles.input}
                placeholder="search your memories..."
                placeholderTextColor="#B8A5B8"
                value={query}
                onChangeText={setQuery}
                multiline
              />
            </View>
            
            <TouchableOpacity
              style={[styles.sendBtn, (!query.trim() || loading) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!query.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="leaf" size={20} color="white" /> 
              )}
            </TouchableOpacity>
          </View>

          {/* 3. Error Banner */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#C85C5C" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* 4. Chat Area (Moves down) */}
          <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              ref={scrollRef}
              style={styles.thread}
              contentContainerStyle={styles.threadContent}
              keyboardShouldPersistTaps="handled"
            >
              {loading && (
                <View style={styles.loaderWrap}>
                  <ActivityIndicator size="small" color="#6B8E4E" />
                  <Text style={styles.loaderText}>checking your diary...</Text>
                </View>
              )}

              {messages.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyImageContainer}>
                  <Image
                    source={require('../../assets/ok_mao.jpg')}
                    style={{
                      width: 180,
                      height: 180,
                      borderRadius: 90,
                    }}
                    resizeMode="cover"
                  />
                  </View>
                  <Text style={styles.emptyTitle}>Maomao is glimmering to examine your body for poison. Start talking to her!</Text>
                  <View style={styles.examplesWrap}>
                    {EXAMPLE_QUERIES.map((ex, i) => (
                      <TouchableOpacity 
                        key={i} 
                        style={styles.exampleChip}
                        onPress={() => {
                          setQuery(ex);
                        }}
                      >
                        <Text style={styles.exampleChipText}>{ex}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : (
                messages.map((msg, i) => (
                  <View 
                    key={i} 
                    style={[
                      styles.messageRow, 
                      msg.role === 'user' ? styles.userRow : styles.aiRow
                    ]}
                  >
                    {/* Icon pfp Picture */}
                    {msg.role === 'ai' && (
                      <View style={styles.pfpWrapper}>
                        <Image 
                          source={require('../../assets/maomao_icon-512.png')} 
                          style={styles.aiAvatar} 
                          resizeMode="cover"
                        />
                        <View style={styles.onlineStatus} />
                      </View>
                    )}

                    <View style={[
                      styles.bubble, 
                      msg.role === 'user' ? styles.userBubble : styles.aiBubble
                    ]}>
                      <Text style={msg.role === 'user' ? styles.userText : styles.aiText}>
                        {msg.text}
                      </Text>
                    </View>
                    
                    {msg.role === 'user' && <View style={{ width: 0 }} />}
                  </View>
                ))
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    top: 120,
    width: 64,
    height: 64,
    borderRadius: 60,
    backgroundColor: '#1A73E8',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  container: { flex: 1, backgroundColor: '#F5EFE6' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EDE7F6',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#4A403A' },
  headerSub: { fontSize: 11, color: '#6B8E4E', fontWeight: '700', textTransform: 'uppercase' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5EFE6' },
  
  topInputBar: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 2,
    borderBottomColor: '#D4A574',
    alignItems: 'center',
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F5F2', 
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#D4A574', 
    paddingHorizontal: 15,
  },
  searchInnerIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#4A403A',
    maxHeight: 100, 
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#6B8E4E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6B8E4E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  sendBtnDisabled: { backgroundColor: '#B8A5B8' },

  thread: { flex: 1 },
  threadContent: { padding: 20, paddingBottom: 40, paddingTop: 10 },
  
  bubble: { padding: 14, borderRadius: 18, marginBottom: 12, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#7B5E7B', borderBottomRightRadius: 4 },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: 'white', borderWidth: 1, borderColor: '#D4A574', borderTopLeftRadius: 4 },
  userText: { color: 'white', fontSize: 15 },
  aiText: { color: '#4A403A', fontSize: 15, lineHeight: 22 },

  loaderWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 },
  loaderText: { color: '#6B8E4E', fontSize: 13, fontWeight: '600' },

  emptyState: { alignItems: 'center', marginTop: 20 },
  emptyTitle: { textAlign: 'center', fontSize: 14, fontWeight: 'bold', color: '#8B8680', marginBottom: 15, textTransform: 'uppercase' },
  examplesWrap: { width: '100%', gap: 8 },
  exampleChip: { backgroundColor: 'white', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#EDE7F6' },
  exampleChipText: { color: '#4A403A', fontSize: 14 },
  
  errorContainer: { flexDirection: 'row', backgroundColor: '#FFF0F0', margin: 15, padding: 12, borderRadius: 10, alignItems: 'center', gap: 8 },
  errorText: { color: '#C85C5C', fontSize: 12, flex: 1 },

  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end', // Aligns PFP with the bottom of the message
    marginBottom: 20,
    gap: 10,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  aiRow: {
    justifyContent: 'flex-start',
  },
  pfpWrapper: {
    position: 'relative',
  },
  aiAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18, 
    borderWidth: 1.5,
    borderColor: '#D4A574', 
    backgroundColor: '#F5EFE6',
  },
  onlineStatus: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#4CAF50', // Live status green
    borderWidth: 2,
    borderColor: 'white',
  },
  bubble: { 
    padding: 14, 
    borderRadius: 20, 
    maxWidth: '78%', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userBubble: { 
    backgroundColor: '#7B5E7B', 
    borderBottomRightRadius: 4, 
  },
  aiBubble: { 
    backgroundColor: 'white', 
    borderWidth: 1, 
    borderColor: '#EDE7F6', 
    borderBottomLeftRadius: 4, 
  },
  userText: { color: 'white', fontSize: 15 },
  aiText: { color: '#4A403A', fontSize: 15, lineHeight: 22 },
  emptyImageContainer: { width: 200, height: 200, borderRadius: 100, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 4, borderColor: '#D4A574', shadowColor: '#6B8E4E', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6, }
});
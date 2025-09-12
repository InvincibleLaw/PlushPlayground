import 'react-native-reanimated';
import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useMemo, useCallback } from 'react';
import { Keyboard, TouchableWithoutFeedback, Image, StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions, SafeAreaView, Alert, Linking, TextInput, FlatList, KeyboardAvoidingView, Platform, Pressable, PanResponder, ImageBackground } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Modal from 'react-native-modal';
import { Ionicons, Feather, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Speech from 'expo-speech';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, useAnimatedGestureHandler, runOnJS, withTiming, withRepeat, withSequence, cancelAnimation } from 'react-native-reanimated';
import { GestureDetector, Gesture, GestureHandlerRootView, PanGestureHandler, PinchGestureHandler, RotationGestureHandler, State } from 'react-native-gesture-handler';



// Audio Tab
const AUDIO_SECTIONS = [
  { key: 'music', label: 'Music' },
  { key: 'voice', label: 'Voice' },
  { key: 'sfx', label: 'Sound Effects' },
];


// Voice changer modes and styles
const VOICE_MODES = [
  { label: 'Pitchy', rate: 1.5, color: '#f39c12', icon: 'arrow-up' },
  { label: 'Low', rate: 0.7, color: '#2980b9', icon: 'arrow-down' },
  { label: 'Grumbly', rate: 0.85, color: '#8e44ad', icon: 'zap' },
  { label: 'Robotic', rate: 1.0, color: '#27ae60', icon: 'cpu' },
  { label: 'Fairy', rate: 1.3, color: '#e67e22', icon: 'star' },
];

// Recorder Main Screen
  function RecorderScreen({setTab, library, setLibrary}) {
   
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [isRecordingSession, setIsRecordingSession] = useState(false);
  const [currentVoiceMode, setCurrentVoiceMode] = useState(VOICE_MODES[0]);
  const [recording, setRecording] = useState(null);
  const [segments, setSegments] = useState([]);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playhead, setPlayhead] = useState(0); // 0 to 1
  const [showRecorderMenu, setShowRecorderMenu] = useState(false);

  // For drag (progress bar)
  const SCREEN = { width: 360 }; // Or use Dimensions.get('window').width
  const progressBarWidth = SCREEN.width * 0.85;

  // Load library on mount
  useEffect(() => {
    loadLibrary();
  }, []);

  // Progress bar update during playback
  useEffect(() => {
    let interval = null;
    if (isPlaying && totalDuration) {
      let played = playhead * totalDuration;
      interval = setInterval(() => {
        played += 150;
        setProgress(Math.min(played / totalDuration, 1));
        setPlayhead(Math.min(played / totalDuration, 1));
        if (played >= totalDuration) clearInterval(interval);
      }, 150);
    } else if (!isPlaying) {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalDuration]);

  // Calculate total duration for progress bar
  const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0);

  // Voice Changer Recording logic
  async function startRecording(mode) {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      setCurrentVoiceMode(mode);

      const { recording } = await Audio.Recording.createAsync(
        Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );
      setRecording({ recording, mode });
    } catch (err) {
      Alert.alert('Error', 'Failed to start recording.\n\n' + err.message);
    }
  }

  async function stopRecording() {
    try {
      if (!recording) return;
      await recording.recording.stopAndUnloadAsync();
      const uri = recording.recording.getURI();
      const { sound: tempSound } = await Audio.Sound.createAsync({ uri });
      const status = await tempSound.getStatusAsync();
      tempSound.unloadAsync();
      setSegments((prev) => [
        ...prev,
        { uri, mode: recording.mode, duration: status.durationMillis || 0 },
      ]);
      setRecording(null);
      setCurrentVoiceMode(VOICE_MODES[0]);
    } catch (err) {
      Alert.alert('Error', 'Failed to stop recording.');
    }
  }

  async function playAllSegments(fromRatio = 0) {
    if (isPlaying || segments.length === 0) return;
    setIsPlaying(true);

    // Figure out which segment and offset to start from:
    let startMs = fromRatio * totalDuration;
    let idx = 0, offsetMs = 0, cumMs = 0;
    for (; idx < segments.length; idx++) {
      if (startMs < cumMs + segments[idx].duration) {
        offsetMs = startMs - cumMs;
        break;
      }
      cumMs += segments[idx].duration;
    }
    if (idx >= segments.length) idx = 0;

    for (let i = idx; i < segments.length; i++) {
      const seg = segments[i];
      try {
        if (sound) await sound.unloadAsync();
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: seg.uri },
          {
            shouldPlay: true,
            rate: seg.mode.rate,
            shouldCorrectPitch: true,
            volume: 1.0,
            positionMillis: i === idx ? Math.max(0, offsetMs) : 0,
          }
        );
        setSound(newSound);

        await new Promise((resolve) => {
          newSound.setOnPlaybackStatusUpdate((status) => {
            if (status.didJustFinish) {
              resolve();
            }
            // Update playhead
            if (status.isPlaying) {
              const msPlayed = (i === idx ? offsetMs : 0) + (status.positionMillis || 0) + (cumMs || 0);
              setPlayhead(Math.min(msPlayed / totalDuration, 1));
            }
          });
        });
        cumMs += seg.duration;
      } catch (err) {
        Alert.alert('Error', 'Failed to play segment.');
      }
    }
    setIsPlaying(false);
    setPlayhead(0);
  }

  async function stopPlayback() {
    setIsPlaying(false);
    if (sound) await sound.unloadAsync();
  }

  // Reset all recordings
  async function resetAll() {
    if (sound) await sound.unloadAsync();
    setSegments([]);
    setProgress(0);
    setIsPlaying(false);
    setRecording(null);
    setCurrentVoiceMode(VOICE_MODES[0]);
    setPlayhead(0);
  }

  // Load library from AsyncStorage
  async function loadLibrary() {
    try {
      const data = await AsyncStorage.getItem(LIBRARY_KEY);
      if (data) setLibrary(JSON.parse(data));
    } catch (err) {
      setLibrary([]);
    }
  }

  // Save recording to Library
  async function saveToLibrary(name) {
    try {
      if (!segments.length) return;
      // Make folder if not exists
      const storyFolder = FileSystem.documentDirectory + 'AudioStories/';
      const dir = await FileSystem.getInfoAsync(storyFolder);
      if (!dir.exists) await FileSystem.makeDirectoryAsync(storyFolder, { intermediates: true });
      // Move each segment
      const newSegs = [];
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const newPath = `${storyFolder}${name}_part${i}.m4a`;
        await FileSystem.copyAsync({ from: seg.uri, to: newPath });
        newSegs.push({
          ...seg,
          uri: newPath,
        });
      }
      // Compose new file entry
      const newFile = {
        id: Date.now().toString(),
        name,
        savedAt: Date.now(),
        totalDuration,
        segments: newSegs,
      };
      // Save to AsyncStorage
      const updatedLib = [newFile, ...library];
      await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(updatedLib));
      setLibrary(updatedLib);
      // Close the modal FIRST!
      setShowSave(false);
      // THEN, use a short delay to reset the rest:
      setTimeout(() => {
        setSegments([]);
        setIsPlaying(false);
        setPlayhead(0);
        setSaveName('');
        setTab('library');
      }, 250);
    } catch (err) {
      Alert.alert('Error', 'Failed to save recording.\n\n' + err.message);
    }
  }

  // For progress bar seeking
  function onProgressBarPress(evt) {
    if (segments.length === 0) return;
    const x = evt.nativeEvent.locationX;
    const ratio = Math.max(0, Math.min(x / progressBarWidth, 1));
    setPlayhead(ratio);
    playAllSegments(ratio);
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>

      {/* Three-dot menu at the very top right */}
      <View style={{
        position: 'absolute',
        top: Platform.OS === 'ios' ? 48 : 20,
        right: 18,
        zIndex: 99
      }}>
        <TouchableOpacity
          style={{ padding: 10 }}
          onPress={() => setShowRecorderMenu(true)}
        >
          <Ionicons name="ellipsis-vertical" size={28} color="#28394e" />
        </TouchableOpacity>
      </View>

      <View style={styles.innerContainer}>
        <Text style={styles.title}>AI Storybook Voice Recorder</Text>
        <View style={styles.playResetRow}>
          <TouchableOpacity
            style={styles.roundButton}
            onPress={() => playAllSegments(playhead)}
            disabled={isPlaying || segments.length === 0}
          >
            <Ionicons name="play" size={40} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roundButton, { backgroundColor: '#eac243' }]}
            onPress={stopPlayback}
            disabled={!isPlaying}
          >
            <Ionicons name="pause" size={36} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.roundButton}
            onPress={resetAll}
            disabled={isPlaying || segments.length === 0}
          >
            <Ionicons name="refresh" size={34} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity
            style={{
              width: 82,
              height: 82,
              borderRadius: 41,
              backgroundColor: isRecordingSession ? '#ff2222' : '#38b6ff',
              alignItems: 'center',
              justifyContent: 'center',
              elevation: 8,
              shadowColor: '#000',
              shadowOpacity: 0.13,
              shadowRadius: 10,
              borderWidth: 4,
              borderColor: isRecordingSession ? '#ffaaaa' : '#cbe9ff',
            }}
            onPress={() => {
              if (!isRecordingSession) {
                setIsRecordingSession(true);
                startRecording(currentVoiceMode);
              } else {
                setIsRecordingSession(false);
                stopRecording();
              }
            }}
          >
            <Ionicons
              name={isRecordingSession ? 'stop' : 'mic-outline'}
              size={48}
              color="#fff"
            />
          </TouchableOpacity>
          <Text style={{
            marginTop: 8,
            color: isRecordingSession ? '#ff2222' : '#28394e',
            fontWeight: 'bold',
            fontSize: 15
          }}>
            {isRecordingSession ? 'Stop Recording' : 'Start Recording'}
          </Text>
        </View>

        {/* Voice buttons */}
        <View style={styles.voiceButtonRow}>
          {VOICE_MODES.map((mode, idx) => (
            <TouchableOpacity
              key={mode.label}
              style={[
                styles.voiceButton,
                {
                  backgroundColor: mode.color,
                  opacity: currentVoiceMode && currentVoiceMode.label === mode.label ? 1 : 0.45,
                  marginRight: idx !== VOICE_MODES.length - 1 ? 9 : 0,
                },
              ]}
              activeOpacity={0.75}
              onPress={async () => {
                if (isRecordingSession) {
                  if (currentVoiceMode && currentVoiceMode.label !== mode.label) {
                    await stopRecording();
                    setCurrentVoiceMode(mode);
                    await startRecording(mode);
                  }
                } else {
                  setCurrentVoiceMode(mode);
                }
              }}
            >
              <Feather name={mode.icon} size={20} color="#fff" />
              <Text style={styles.voiceButtonText}>{mode.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Progress Bar */}
        <View
          style={styles.progressBarBackground}
          onStartShouldSetResponder={() => true}
          onResponderGrant={onProgressBarPress}
        >
          <View style={styles.progressBarTrack} />
          {/* Progress Fill */}
          <View
            style={[
              styles.progressBarFill,
              { width: `${totalDuration ? progress * 100 : 0}%` },
            ]}
          />
          {/* Vertical playhead */}
          <View
            style={[
              styles.playheadLine,
              {
                left: playhead * progressBarWidth - 1,
                backgroundColor: isPlaying ? '#38b6ff' : '#b3b8c3',
              },
            ]}
          />
        </View>
        <Text style={styles.segmentInfo}>
          Segments: {segments.length} | {Math.round(totalDuration / 1000)}s
        </Text>
        {segments.length > 0 && (
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => setShowSave(true)}
          >
            <Ionicons name="save-outline" size={26} color="#fff" />
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        )}

        {/* 3-dot menu Modal */}
        <Modal
          isVisible={showRecorderMenu}
          onBackdropPress={() => setShowRecorderMenu(false)}
          style={{ justifyContent: 'flex-end', margin: 0 }}
        >
          <View style={{
            backgroundColor: '#f8fafd',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: 34,
            paddingTop: 10,
            alignItems: 'center'
          }}>
            <TouchableOpacity
              style={{ width: '100%', padding: 20, alignItems: 'center' }}
              onPress={() => {
                setShowRecorderMenu(false);
                // Import audio handler here
              }}
            >
              <Text style={{ color: '#2187fa', fontSize: 18 }}>Import audio</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ width: '100%', padding: 20, alignItems: 'center' }}
              onPress={() => {
                setShowRecorderMenu(false);
                setTab('tts');
              }}
            >
              <Text style={{ color: '#2187fa', fontSize: 18 }}>Text to speech</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ width: '100%', padding: 20, alignItems: 'center' }}
              onPress={() => setShowRecorderMenu(false)}
            >
              <Text style={{ color: '#2187fa', fontSize: 20, fontWeight: '500' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </View>
      {/* Save Modal */}
      <Modal isVisible={showSave}>
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save Recording</Text>
            <TextInput
              placeholder="Enter a name..."
              value={saveName}
              onChangeText={setSaveName}
              style={styles.modalInput}
              autoFocus
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#38b6ff' }]}
                onPress={() => {
                  if (!saveName) return;
                  saveToLibrary(saveName.trim());
                }}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#aaa' }]}
                onPress={() => setShowSave(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// Text to speech screen
  function TTSScreen() {
    const [text, setText] = useState('');
    const [selectedMode, setSelectedMode] = useState(VOICE_MODES[0]); // default: Fairy
    const [showVoiceMenu, setShowVoiceMenu] = useState(false);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <View style={{ flex: 1, backgroundColor: '#fff', paddingHorizontal: 8 }}>
      {/* Top row: voice mode button and icon */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <TouchableOpacity
          style={{
            paddingVertical: 8,
            paddingHorizontal: 18,
            backgroundColor: '#f6f7fa',
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: '#ececec',
            flexDirection: 'row',
            alignItems: 'center'
          }}
          onPress={() => setShowVoiceMenu(true)}
        >
          <Text style={{ color: selectedMode.color, fontWeight: 'bold', fontSize: 18 }}>
            {selectedMode.label}
          </Text>
          <Ionicons name="chevron-down" size={20} color={selectedMode.color} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            width: 62, height: 62, borderRadius: 31,
            backgroundColor: '#ff2222', alignItems: 'center', justifyContent: 'center',
            borderWidth: 3, borderColor: '#fff', shadowColor: '#ff2222', shadowOpacity: 0.12, shadowRadius: 6
          }}
          onPress={() => {
            if (text.trim().length === 0) return;
            Speech.stop(); // Optional: stops any current speech before playing again
            Speech.speak(text, {
              pitch: selectedMode.pitch,
              rate: selectedMode.rate,
              language: 'en-US', // you can change this if needed
            });
          }}
        >
          <Ionicons name="mic-outline" size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Voice dropdown modal */}
      <Modal
        isVisible={showVoiceMenu}
        onBackdropPress={() => setShowVoiceMenu(false)}
        style={{ justifyContent: 'flex-end', margin: 0 }}
      >
        <View style={{
          backgroundColor: '#fff',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingVertical: 20,
          alignItems: 'center'
        }}>
          {VOICE_MODES.map((mode, idx) => (
            <TouchableOpacity
              key={mode.label}
              style={{
                paddingVertical: 14,
                width: '92%',
                alignItems: 'center',
                borderBottomWidth: idx < VOICE_MODES.length - 1 ? 1 : 0,
                borderBottomColor: '#ececec',
                flexDirection: 'row',
                justifyContent: 'center'
              }}
              onPress={() => {
                setSelectedMode(mode);
                setShowVoiceMenu(false);
              }}
            >
              <Text style={{ color: mode.color, fontSize: 18, fontWeight: 'bold' }}>{mode.label}</Text>
              {selectedMode.label === mode.label && (
                <Ionicons name="checkmark" size={20} color="#e44184" style={{ marginLeft: 7 }} />
              )}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={{ padding: 14, width: '92%', alignItems: 'center' }}
            onPress={() => setShowVoiceMenu(false)}
          >
            <Text style={{ color: '#999', fontSize: 18 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Text input */}
      <View style={{
        backgroundColor: '#f6f7fa',
        borderRadius: 17,
        marginTop: 30,
        padding: 8,
        minHeight: 210
      }}>
        <TextInput
          style={{
            fontSize: 17,
            minHeight: 180,
            color: '#2d2d2d',
            padding: 12,
          }}
          placeholder="Enter text..."
          placeholderTextColor="#9ba4b5"
          value={text}
          onChangeText={setText}
          multiline
        />
      </View>
    </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    paddingBottom: 68,
    backgroundColor: '#f3f6fa',
  },
  innerContainer: {
    width: SCREEN.width - 20,
    margin: 10,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    alignItems: 'center',
    padding: 18,
    paddingBottom: 28,
    elevation: 2,
    zIndex: 11,
  },
  title: {
    fontSize: 25,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#28394e',
    textAlign: 'center',
  },
  playResetRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    gap: 20,
  },
  roundButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#38b6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.11,
    shadowRadius: 4,
  },
  voiceButtonRow: {
    flexDirection: 'row',
    marginTop: 22,
    marginBottom: 18,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    flexWrap: 'wrap',
  },
  voiceButton: {
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 13,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    marginBottom: 3,
    flexDirection: 'row',
    gap: 6,
  },
  voiceButtonText: {
    fontWeight: 'bold',
    color: '#fff',
    fontSize: 13,
    marginLeft: 5,
  },
  progressBarBackground: {
    width: '85%',
    height: 16,
    backgroundColor: '#e0e7ef',
    borderRadius: 8,
    marginTop: 18,
    overflow: 'hidden',
    alignSelf: 'center',
    position: 'relative',
    justifyContent: 'center',
  },
  progressBarTrack: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#e0e7ef',
    borderRadius: 8,
  },
  progressBarFill: {
    position: 'absolute',
    left: 0,
    height: '100%',
    backgroundColor: '#38b6ff',
    zIndex: 1,
  },
  playheadLine: {
    position: 'absolute',
    width: 4,
    height: 26,
    top: -5,
    borderRadius: 2,
    backgroundColor: '#38b6ff',
    zIndex: 3,
  },
  segmentInfo: {
    marginTop: 14,
    fontSize: 15,
    color: '#2d3c52',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: '#38b6ff',
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 9,
    alignSelf: 'center',
    elevation: 2,
  },
  saveButtonText: {
    fontSize: 17,
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
    // Save Modal
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 22,
    borderRadius: 18,
    alignItems: 'center',
    width: 310,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    marginBottom: 13,
    color: '#28394e',
  },
  modalInput: {
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    width: '98%',
    padding: 10,
    fontSize: 17,
    marginBottom: 17,
    backgroundColor: '#fafbfd',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '98%',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 9,
    backgroundColor: '#38b6ff',
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
   

  });
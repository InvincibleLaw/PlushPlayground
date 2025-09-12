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
import { Skia, SkiaPath, Canvas, Path, useCanvasRef } from "@shopify/react-native-skia";
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Rect, Polygon } from 'react-native-svg';
import { imagePacks } from './assets/imagePacks/imagePacks';
import { FavoritesProvider, useFavorites } from "./favorites";

  // Library tab selection state
    const [libraryTab, setLibraryTab] = useState('images'); // 'audio' or 'images'
  //Audio and Image Tab Expand Buttons
    const [expandedAudioSections, setExpandedAudioSections] = useState({});
    const [expandedImageSections, setExpandedImageSections] = useState({});
    const [selectedImagePlaceholder, setSelectedImagePlaceholder] = useState(null);
    const [selectedLibraryItem, setSelectedLibraryItem] = useState(null);
    const [showLibraryMenu, setShowLibraryMenu] = useState(false);
    const [isPlaying] = useState(false);
  // Organize your audio files into sections (this can be adapted later for true types)
    const audioSectionsData = {
      music: [], // You can add logic to put specific files here
      voice: library, // All current files are in 'voice' for now
      sfx: [],
    };
    
    // Share modal
    const [shareModal, setShareModal] = useState(false);

 const handleOpenItemMenu = (item) => {
    setSelectedLibraryItem(item);
    setShowLibraryMenu(true);
    };

    // Play a library file
    async function playLibraryFile(item) {
      if (isPlaying) return;
      setIsPlaying(true);
      for (let i = 0; i < item.segments.length; i++) {
        const seg = item.segments[i];
        try {
          if (sound) await sound.unloadAsync();
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: seg.uri },
            {
              shouldPlay: true,
              rate: seg.mode.rate,
              shouldCorrectPitch: true,
              volume: 1.0,
            }
          );
          setSound(newSound);

          await new Promise((resolve) => {
            newSound.setOnPlaybackStatusUpdate((status) => {
              if (status.didJustFinish) resolve();
            });
          });
        } catch (err) {}
      }
      setIsPlaying(false);
    }

  return (
    <View style={styles.libraryContainer}>


<TouchableOpacity
          style={[
            styles.libraryTabButton,
            libraryTab === 'audio' && styles.libraryTabButtonActive,
          ]}
          onPress={() => setLibraryTab('audio')}
        >
          <Text
            style={[
              styles.libraryTabText,
              { color: libraryTab === 'audio' ? '#38b6ff' : '#28394e' },
            ]}
          >
            Audio
          </Text>
        </TouchableOpacity>
            </View>

            {libraryTab === 'audio' ? (
  <>
    <Text style={styles.libraryTitle}>Audio Library</Text>
    {/* Playback progress bar */}
    {isPlaying && (
      <View style={{ height: 8, width: '92%', backgroundColor: '#e0e7ef', borderRadius: 6, marginVertical: 8, alignSelf: 'center' }}>
        <View
          style={{
            width: `${Math.round(progress * 100)}%`,
            height: '100%',
            backgroundColor: '#38b6ff',
            borderRadius: 6,
          }}
        />
      </View>
    )}
    {AUDIO_SECTIONS.map((section) => (
      <View key={section.key} style={{ width: '100%' }}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', padding: 13, backgroundColor: '#e7eaf2', borderRadius: 10, marginTop: 8 }}
          onPress={() =>
            setExpandedAudioSections((prev) => ({
              ...prev,
              [section.key]: !prev[section.key],
            }))
          }
        >
          <Text style={{ fontWeight: 'bold', fontSize: 17, color: '#28394e', flex: 1 }}>
            {section.label}
          </Text>
          <Ionicons
            name={expandedAudioSections[section.key] ? 'chevron-up' : 'chevron-down'}
            size={22}
            color="#38b6ff"
          />
        </TouchableOpacity>
        {expandedAudioSections[section.key] &&
          (audioSectionsData[section.key] && audioSectionsData[section.key].length > 0 ? (
            audioSectionsData[section.key].map((item) => (
              <View style={styles.libraryItem} key={item.id}>
                {/* Three-dot menu button left of play/pause */}
                <TouchableOpacity
                  style={{ marginLeft: 4, marginRight: 4, padding: 8 }}
                  onPress={() => handleOpenItemMenu(item)}
                >
                  <Ionicons name="ellipsis-vertical" size={22} color="#666" />
                </TouchableOpacity>
                <View style={styles.libraryDetails}>
                  <Text style={styles.libraryName}>{item.name}</Text>
                  <Text style={styles.libraryLength}>
                    {Math.round(item.totalDuration / 1000)}s
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.libraryPlay}
                  onPress={() => playLibraryFile(item)}
                >
                  <Ionicons name={isPlaying ? "pause" : "play"} size={28} color="#38b6ff" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={{ color: '#999', marginLeft: 14, marginTop: 3, marginBottom: 4 }}>
              No recordings yet.
            </Text>
          ))}
      </View>
    ))}
  </>

) : ()}


//Audio Share Modal
 <Modal isVisible={shareModal}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>test</Text>
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: '#38b6ff', alignSelf: 'center' }]}
            onPress={() => setShareModal(false)}
          >
            <Text style={styles.modalButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </Modal>
      
      <Modal
        isVisible={showLibraryMenu}
        onBackdropPress={() => setShowLibraryMenu(false)}
        style={{ justifyContent: 'flex-end', margin: 0 }}
        >
        <View style={{
          backgroundColor: '#fff',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingVertical: 20,
          alignItems: 'center'
        }}>
          <TouchableOpacity
            style={{ width: '100%', padding: 20, alignItems: 'center' }}
            onPress={() => {
              setShowLibraryMenu(false);
              // TODO: implement share if you want
            }}
          >
            <Text style={{ color: '#2187fa', fontSize: 18 }}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ width: '100%', padding: 20, alignItems: 'center' }}
            onPress={async () => {
              if (selectedLibraryItem) {
                // Remove file from AsyncStorage and from local state
                const updatedLib = library.filter(item => item.id !== selectedLibraryItem.id);
                await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(updatedLib));
                setLibrary(updatedLib);
              }
              setShowLibraryMenu(false);
            }}
          >
            <Text style={{ color: '#e44144', fontSize: 18, fontWeight: 'bold' }}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ width: '100%', padding: 20, alignItems: 'center' }}
            onPress={() => setShowLibraryMenu(false)}
          >
            <Text style={{ color: '#999', fontSize: 18 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
  
const styles = StyleSheet.create({

    // Library styles
  libraryContainer: {
    flex: 1,
    paddingTop: 10,
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#f3f6fa',
  },
  libraryTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#28394e',
    textAlign: 'center',
  },
  libraryItem: {
    width: '97%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginVertical: 5,
    borderRadius: 15,
    paddingHorizontal: 13,
    paddingVertical: 14,
    elevation: 1,
    shadowColor: '#222',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    alignSelf: 'center',
  },
    libraryDetails: { flex: 1 },
    libraryName: { fontSize: 18, fontWeight: 'bold', color: '#28394e' },
    libraryLength: { fontSize: 13, color: '#888', marginTop: 4 },
    libraryPlay: { marginLeft: 9, marginRight: 2, padding: 6 },
    libraryShare: { marginLeft: 3, padding: 7 },
    libraryTabBar: {
    flexDirection: 'row',
    backgroundColor: '#e7eaf2',
    borderRadius: 19,
    marginBottom: 20,
    marginTop: 4,
    alignSelf: 'center',
    left: 45,
    width: '65%',
    overflow: 'hidden',
  },

  libraryTabText: {
    fontSize: 27,
    fontWeight: 'bold',
    letterSpacing: 0.4,
    justifyContent: "center",
    alignContent: 'center',
    color: "#28394e",
  },

  libraryTabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#e7eaf2',
  },
  libraryTabButtonActive: {
    backgroundColor: '#d3e9f9',
  },

  });
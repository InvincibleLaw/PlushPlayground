import { ThemeProvider } from "./theme/ThemeProvider";
import 'react-native-reanimated';
import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useMemo, useCallback, createContext,useContext, useReducer, } from 'react';
import { Keyboard, TouchableWithoutFeedback, Image, StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions, SafeAreaView, Alert, Linking, TextInput, FlatList, KeyboardAvoidingView, Platform, Pressable, PanResponder, ImageBackground } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Modal from 'react-native-modal';
import { Ionicons, Feather, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Speech from 'expo-speech';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, useAnimatedGestureHandler, runOnJS, withTiming, withRepeat, withSequence, cancelAnimation, Easing } from 'react-native-reanimated';
import { GestureDetector, Gesture, GestureHandlerRootView, PanGestureHandler, PinchGestureHandler, RotationGestureHandler, State } from 'react-native-gesture-handler';
import { Skia, SkiaPath, Canvas, Path, useCanvasRef, center } from "@shopify/react-native-skia";
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Rect, Polygon } from 'react-native-svg';
import { imagePacks } from './assets/imagePacks/imagePacks';
import { FavoritesProvider, useFavorites } from "./favorites";
import * as ImagePicker from 'expo-image-picker';

import { tokens } from "./tokens";


// Preload Home Screen button image assets
const assets = {
  storyboard: require("./Images/Homepage/Lets Play Cropped.png"),
  library: require("./Images/Homepage/Library Cropped.png"),
  shop: require("./Images/Homepage/Shop.png"),
  homeBg: require("./assets/imagePacks/backgrounds/great_outdoor_alt2.png"),
  
  ShopBg: require("./assets/imagePacks/backgrounds/great_outdoor_alt2.png"),
  BuddieSystem: require("./Images/Affiliates/buddiesystem_link.png"),
  Aurora: require("./Images/Affiliates/aurora_link.png"),
};

//Affilate Links
const SHOP_URLS = {
    buddie: "https://finturely.com/collections/bottle-buddies",
    aurora: "https://auroragift.com/?rfsn=8753468.0c9b26&utm_source=refersion&utm_medium=affiliate&utm_campaign=8753468.0c9b26",
  };

  const openAffiliate = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Unable to open link", "Your device cannot open this URL.");
      }
    } catch (e) {
      Alert.alert("Error", "Something went wrong opening the link.");
    }
  };

// Max image/speech bubbles, pages ADDS & history bar items
const MAX_ITEMS_PER_PAGE = 40;
const MAX_PAGES = 10;
const MAX_ITEMS_HISTORYBAR = 120;

// A history entry can be either: image or speech bubble
function makeImageEntry(text, img) {
  const e = { text: String(text), source: "image" };
  if (img) e.img = img;
  return e;
}
function makeSpeechEntry(text, audioUri) {
  const e = { text: String(text), source: "speech" };
  if (audioUri) e.audioUri = audioUri;
  return e;
}

// ---------- Context ----------
const HistoryContext = createContext(null);

// ---------- Reducer for ONE global transcript ----------
function historyReducer(state, action) {
  switch (action.type) {
    case "FILTER_OUT_NO_IMAGE":
      return state.filter(e => e?.text !== "No Image!");
    case "ADD_IMAGE": {
      if (!action.text) return state;
      const next = [makeImageEntry(action.text, action.img), ...state];
      return next.slice(0, MAX_ITEMS_HISTORYBAR);
    }
    case "ADD_SPEECH": {
      if (!action.text) return state;
      const next = [makeSpeechEntry(action.text, action.audioUri), ...state];
      return next.slice(0, MAX_ITEMS_HISTORYBAR);
    }
    case "CLEAR": return [];
    default: return state;
  }
}

// ---------- Provider ----------
function HistoryProvider({ children }) {
  // Global transcript (shared across all pages)
  const [globalTranscript, dispatch] = useReducer(historyReducer, []);

  // A single set of "current page" handlers (StoryboardScreen registers on mount)
  const currentHandlersRef = useRef(
    /** @type {{ onTapLine?: (line:string, source:'image'|'speech', audioUri?:string)=>void }} */ ({})
  );

  // Shared bar metrics (measured once; consumers can use in clamp/padding)
  const [metrics, setMetrics] = useState({
    history: { height: 0, absY: 0 },
    favorite: { height: 0, absY: 0 },
    trash: { height: 0, absY: 0 },
  });

  // ---- Actions (stable) ----
  const addImageLine = useCallback((text, img) => {
    dispatch({ type: "ADD_IMAGE", text, img });
  }, []);

  const addSpeechLine = useCallback((text, audioUri) => {
    dispatch({ type: "ADD_SPEECH", text, audioUri });
  }, []);

  const clearHistory = useCallback(() => {
    dispatch({ type: "CLEAR" });
  }, []);

  const clearNoImageFromHistory = useCallback(() => {
   dispatch({ type: "FILTER_OUT_NO_IMAGE" });
  }, []);

  const registerCurrentPageHandlers = useCallback((handlers) => {
    currentHandlersRef.current = handlers || {};
    return () => {
      // on unmount, clear if this page registered itself
      if (currentHandlersRef.current === handlers) {
        currentHandlersRef.current = {};
      }
    };
  }, []);

  const setHistoryBarMetrics = useCallback((height, absY) => {
    setMetrics((m) =>
      m.history.height === height && m.history.absY === absY
        ? m
        : { ...m, history: { height, absY } }
    );
  }, []);

  const setFavoriteBarMetrics = useCallback((height, absY) => {
    setMetrics((m) =>
      m.favorite.height === height && m.favorite.absY === absY
        ? m
        : { ...m, favorite: { height, absY } }
    );
  }, []);

  const setTrashBarMetrics = useCallback((height, absY) => {
    setMetrics((m) =>
      m.trash.height === height && m.trash.absY === absY
        ? m
        : { ...m, trash: { height, absY } }
    );
  }, []);

  const value = useMemo(
    () => ({
      // state
      globalTranscript,
      metrics,
      currentHandlersRef,
      // actions
      addImageLine,
      addSpeechLine,
      clearHistory,
      clearNoImageFromHistory,
      registerCurrentPageHandlers,
      setHistoryBarMetrics,
      setFavoriteBarMetrics,
      setTrashBarMetrics,
      MAX_ITEMS_HISTORYBAR,
    }),
    [
      globalTranscript,
      metrics,
      addImageLine,
      addSpeechLine,
      clearHistory,
      clearNoImageFromHistory,
      registerCurrentPageHandlers,
      setHistoryBarMetrics,
      setFavoriteBarMetrics,
      setTrashBarMetrics,
    ]
  );

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

// ---------- Hooks ----------
function useHistory() {
  return useContext(HistoryContext);
}

// ---------- Single, global History Bar ----------
function HistoryBar({ tokens, defaultPrompt }) {
  const { globalTranscript, clearHistory, setHistoryBarMetrics, currentHandlersRef } = useHistory();
  const scrollRef = useRef(null);

  // Auto-scroll left to reveal newest (we prepend)
  useEffect(() => {
    try {
      scrollRef.current?.scrollTo({ x: 0, animated: true });
    } catch {}
  }, [globalTranscript]);

  return (
    <View style={{ position: "relative", width: "100%" }}>
      <View
        style={{
          position: "absolute",
          flexDirection: "row",
          alignItems: "center",
          width: "100%",
          paddingHorizontal: tokens.spacing.sm,
          paddingBottom: tokens.spacing.sm,
          bottom: 0,
          height: tokens.barHeight.md,
          backgroundColor: "#f4f7fb",
        }}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          const y = e.nativeEvent.layout.y + h;
          setHistoryBarMetrics(h, y);
        }}
      >
        {/* Clear all */}
        <TouchableOpacity
          onPress={clearHistory}
          style={{ padding: tokens.spacing.xs, marginRight: tokens.spacing.xs }}
          hitSlop={12}
        >
          <Ionicons name="refresh" size={tokens.iconSize.lg} color="#28394e" />
        </TouchableOpacity>

        {/* Scrollable global history */}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, alignItems: "center", paddingHorizontal: tokens.spacing.xs }}
          style={{ flex: 1, height: tokens.barHeight.md }}
        >
          {globalTranscript.length === 0 ? (
          defaultPrompt ? (
            <Text
              style={{
                fontSize: tokens.fontSize.body,
                color: "#bbb",
                marginRight: tokens.spacing.sm,
                fontStyle: "italic",
                paddingHorizontal: tokens.spacing.xs,
              }}
              numberOfLines={1}
            >
              {defaultPrompt}
            </Text>
          ) : null
        ) : (
          globalTranscript.map((entry, idx) => {
            if (!entry?.text || typeof entry.text !== "string") return null;

            const isImage = entry.source === "image" && entry.img;

            return isImage ? (
              <DraggableHistoryBubble
                key={`${idx}_${entry.text}`}
                line={entry.text}
                image={entry.img}
                source="image"
                onTap={(line) => {
                  // normalized 'image' goes through your ScreenNavigation mapping to 'wand'
                  currentHandlersRef.current?.onTapLine?.(line, "image", /*audioUri*/ undefined, /*fromHistory*/ true);
                }}
              />
            ) : (
              <DraggableHistoryBubble
                key={`${idx}_${entry.text}`}
                line={entry.text}
                image={null}                 
                source="speech"
                audioUri={entry.audioUri}
                onTap={(line) => {
                  // normalized 'speech' goes through your mapping to 'mic'
                    currentHandlersRef.current?.onTapLine?.(line, "speech", entry.audioUri, /*fromHistory*/ true);
                }}
              />
            );
          })
        )}
        </ScrollView>
      </View>
    </View>
  );
}

//Animated Search Bar
const SEARCH_COLLAPSED = tokens.barHeight.sm;
const SEARCH_EXPANDED = tokens.canvasModal.md;

const ModernSearchBar = forwardRef(({ query, setQuery, onSearch }, ref) => {
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  // Animate width and icon
  const width = useSharedValue(SEARCH_COLLAPSED);

  // Animated styles
  const animStyle = useAnimatedStyle(() => ({
    width: width.value,
  }));

  // Open/close handler
  const toggle = () => {
    if (!open) {
      width.value = withSpring(SEARCH_EXPANDED, { damping: 15, stiffness: 150 });
      setOpen(true);
      setTimeout(() => inputRef.current?.focus(), 200); // Wait for expand
    } else {
      width.value = withSpring(SEARCH_COLLAPSED, { damping: 15, stiffness: 150 });
      setOpen(false);
      setQuery('');
      onSearch && onSearch('');
      inputRef.current?.blur();
    }
  };

    // Expose close function to parent via ref
  useImperativeHandle(ref, () => ({
    close: () => {
      width.value = withSpring(SEARCH_COLLAPSED, { damping: 15, stiffness: 150 });
      setOpen(false);
      setQuery('');
      onSearch && onSearch('');
      inputRef.current?.blur();
    },
    open: () => toggle(),
  }));

  // On input change
  const handleChange = (text) => {
    setQuery(text);
    onSearch && onSearch(text);
  };

  // Determine background color
  const backgroundColor = open ? '#fff' : 'transparent';

  return (
    <View style={styles.root}>
      <Animated.View style={[
        styles.searchContainer,
        { backgroundColor },  // <-- use the variable here
        animStyle
      ]}>
        {open ? (
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={handleChange}
            placeholder="Search…"
            style={styles.input}
            autoFocus
            onBlur={toggle}
            returnKeyType="search"
            underlineColorAndroid="transparent"
          />
        ) : null}
        <Pressable onPress={toggle} style={styles.iconBtn} hitSlop={12}>
          <Ionicons name={open ? "close" : "search"} size={tokens.iconSize.lg} color="#28394e" />
        </Pressable>
      </Animated.View>
    </View>
  );
});

function getImageByPhrase(phrase) {
  if (!phrase) return null;
  for (let pack of Object.values(imagePacks)) {
    for (let item of pack) {
      if (item.label.toLowerCase().includes(phrase.toLowerCase())) {
        return item.img;
      }
    }
  }
  return null;
}

function SimpleDropdown({ value, onChange, options, width = '100%', renderOptionRight, shouldCloseOnSelect }) {
  const [open, setOpen] = useState(false);

  // (unchanged) Find the selected option if you use it elsewhere
  const selectedOption = options.find(opt => opt.label === value);

  return (
    <View style={{ width, position: 'relative' }}>
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f1f1f8',
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: tokens.radius.sm,
          paddingHorizontal: tokens.spacing.md,
          height: tokens.barHeight.xs,
          zIndex: 10001,
        }}
        // open-only (no toggle), and disable while open
        onPress={() => { if (!open) setOpen(true); }}
        disabled={open}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: tokens.fontSize.subheading, lineHeight: tokens.barHeight.xs * 0.9, color: value ? '#222' : '#888', flex: 1 }}
          numberOfLines={1}
        >
          {value ? value : "Choose a background"}
        </Text>
        <Ionicons name="chevron-down" size={tokens.iconSize.sm} color="#555" style={{ marginLeft: tokens.spacing.xs }} />
      </TouchableOpacity>

      <Modal
        isVisible={open}
        onBackdropPress={() => setOpen(false)}
        onBackButtonPress={() => setOpen(false)}
        backdropOpacity={0.25}
        backdropColor='transparent'
        useNativeDriver
        useNativeDriverForBackdrop
        hideModalContentWhileAnimating
        animationIn="fadeIn"
        animationOut="fadeOut"
        animationInTiming={100}
        animationOutTiming={80}
        style={{ margin: 0 }}
      >
        <View
          style={{
            position: 'absolute',
            left: tokens.spacing.lg,
            bottom: tokens.barHeight.md * 2 + tokens.barHeight.sm + tokens.spacing['4xl'],
            paddingBottom: tokens.spacing.md,
            width: '60%',
            backgroundColor: '#fff',
            borderRadius: tokens.radius.sm,
            borderWidth: 1,
            borderColor: '#ddd',
            shadowColor: '#000',
            shadowOpacity: 0.09,
            shadowRadius: 5,
            elevation: 30,
            maxHeight: tokens.canvasModal.lg,
            overflow: 'hidden',
          }}
        >
            <ScrollView style={{ maxHeight: tokens.canvasModal.lg }} nestedScrollEnabled showsVerticalScrollIndicator>
              {options.map(opt => {
                const willClose = typeof shouldCloseOnSelect === 'function'
                  ? shouldCloseOnSelect(opt)
                  : (shouldCloseOnSelect !== false); // default true

                const customRight = typeof renderOptionRight === 'function'
                  ? renderOptionRight(opt, {
                      close: () => setOpen(false),
                      keepOpen: () => setOpen(true),
                    })
                  : null;

                return (
                  <TouchableOpacity
                    key={opt.key || opt.label}
                    onPress={() => {
                      if (willClose) setOpen(false);
                      setTimeout(() => onChange(opt), 0);
                    }}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: tokens.spacing.md,
                      paddingHorizontal: tokens.spacing.lg,
                      backgroundColor: value === opt.label ? '#eaf6ff' : '#fff',
                      borderRadius: tokens.radius.sm,
                    }}
                  >
                    <Text
                      style={{ fontSize: tokens.fontSize.subheading, color: '#444', flex: 1 }}
                      numberOfLines={1}
                    >
                      {opt.label}
                    </Text>

                    {customRight ?? (
                      !!opt.img && (
                        <Image
                          source={opt.img}
                          style={{
                            width: tokens.imageSize.sm,
                            height: tokens.imageSize.sm,
                            borderRadius: tokens.radius.sm,
                            marginHorizontal: tokens.spacing.xs,
                            
                          }}
                        />
                      )
                    )}
                  </TouchableOpacity>
                );
              })}

            </ScrollView>
          </View>
        </Modal>
   
    </View>
  );
}

// Alternate Background Dropdown Menu (iOS-friendly, flicker-free)
function AltBackgroundDropdown({
  altOptions,
  selectedAlternateIdx,
  setSelectedAlternateIdx,
  updatePageState,
  menuRight = tokens.spacing['3xl'] + tokens.spacing.xs,
  menuBottom = (tokens.barHeight.md * 2) + tokens.barHeight.sm + tokens.spacing['4xl'],
  menuWidth = "28%",
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={{ position: 'relative' }}>
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f1f1f8',
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: tokens.radius.sm,
          paddingHorizontal: tokens.spacing.md,
          height: tokens.barHeight.xs,
        }}
        // open-only, disable while open
        onPress={() => { if (!open) setOpen(true); }}
        disabled={open}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: tokens.fontSize.subheading, color: '#444' }}>
          {altOptions?.[selectedAlternateIdx]?.label ?? ""}
        </Text>
        <Ionicons name="chevron-down" size={tokens.iconSize.sm} color="#555" style={{ marginLeft: tokens.spacing.xs }} />
      </TouchableOpacity>

     <Modal
      isVisible={open}
      onBackdropPress={() => setOpen(false)}
      onBackButtonPress={() => setOpen(false)}
      backdropOpacity={0.35}
      backdropColor="transparent"
      useNativeDriver
      useNativeDriverForBackdrop
      hideModalContentWhileAnimating
      animationIn="fadeIn"
      animationOut="fadeOut"
      animationInTiming={100}
      animationOutTiming={80}
      style={{ margin: 0 }}
    >
      <View
        style={{
          position: 'absolute',
          right: menuRight,
          bottom: menuBottom,
          width: menuWidth,
          backgroundColor: '#fff',
          borderRadius: tokens.radius.sm,
          borderWidth: 1,
          borderColor: '#ddd',
          shadowColor: '#000',
          shadowOpacity: 0.09,
          shadowRadius: 5,
          elevation: 30,
          overflow: 'hidden',
        }}
      >
        {altOptions?.map((opt, idx) => {
          const selected = selectedAlternateIdx === idx;
          return (
            <TouchableOpacity
              key={opt.label}
              onPress={() => {
                // fade out first, then apply selection
                setOpen(false);
                setTimeout(() => {
                  setSelectedAlternateIdx(idx);
                  updatePageState({
                    background: opt.img,
                    altBackgroundIndex: idx,
                    altBackgroundLabel: opt.label,
                  });
                }, 100); // small delay avoids modal race; tweak 100–150ms if needed
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: tokens.spacing.md,
                paddingHorizontal: tokens.spacing.lg,
                backgroundColor: selected ? '#eaf6ff' : '#fff',
                borderRadius: tokens.radius.sm,
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: tokens.fontSize.subheading, color: '#444', flex: 1 }}>
                {opt.label}
              </Text>
              {!!opt.img && (
                <Image
                  source={opt.img}
                  style={{
                    width: tokens.imageSize.sm,
                    height: tokens.imageSize.sm,
                    borderRadius: tokens.radius.sm,
                    marginHorizontal: tokens.spacing.xs,
                  }}
                  resizeMode="cover"
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </Modal>

    </View>
  );
}

//Floating Animated Brush Buttons
function FloatingButtonMenu({
  origin = { x: 0, y: 0 },
  open = false,
  icons = [],
  actions = [],
  radius = 90,
  spreadAngle = 220,
  childButtonSize = tokens.button.lg,
}) {
  const anim = useSharedValue(0);
  const [shouldRender, setShouldRender] = useState(open);
 
  const MAX_BUTTONS = 6;

  useEffect(() => {
    if (open) {
      setShouldRender(true);
    } else {
      const timeout = setTimeout(() => setShouldRender(false), 350);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  useEffect(() => {
    anim.value = withSpring(open ? 1 : 0, { damping: 13 });
  }, [open]);

  // Generate styles for each button (fixed count)
  const childStyles = [];
  for (let i = 0; i < MAX_BUTTONS; i++) {
    const numChildren = MAX_BUTTONS;
    const startAngle = 90 - spreadAngle / 2;
    const angle = (startAngle + (spreadAngle / (numChildren - 1)) * i) * (Math.PI / 180);

    childStyles.push(
      useAnimatedStyle(() => {
        const scaleValue = Math.min(anim.value * 1.4, 1);
        return {
          position: 'absolute',
          transform: [
            { translateX: origin.x + anim.value * radius * Math.cos(angle) - childButtonSize / 2 },
            { translateY: origin.y - anim.value * radius * Math.sin(angle) - childButtonSize / 2 },
            { scale: withSpring(scaleValue, {
                damping: 6,
                mass: 0.6,
                stiffness: 400,
                overshootClamping: false,
              }),
            },
          ],
          opacity: Math.min(anim.value * 1.1, 1),
        };
      })
    );
  }

  if (!shouldRender) return null;

  return (
    <View
      style={{
        position: 'absolute',
        left: 0, top: 0, right: 0, bottom: 0,
        zIndex: 9999,
        pointerEvents: 'box-none',
      }}
      pointerEvents="box-none"
    >
      {icons.map((icon, i) => (
        <Animated.View key={i} style={childStyles[i]}>
          <TouchableOpacity
            style={{
              width: childButtonSize,
              height: childButtonSize,
              borderRadius: childButtonSize / 2,
              backgroundColor: 'rgba(244, 247, 251, 0.5)',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: "#000",
              shadowOpacity: 0.18,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
            }}
            onPress={actions[i]}
          >
            {icon}
          </TouchableOpacity>
        </Animated.View>
      ))}
    </View>
  );
}

// Stortyboard screen - Draggable Image
function DraggableImage({
  text, source, x, y, rotation = 0, scale = 1,
  onMove, onRotate, onScale,
  parentWidth, parentHeight, trashBarHeight,
  onOverTrash, onLeaveTrash, onDelete,
  renderContent, isSpeechBubble, isDrawing = false, drawingWidth, drawingHeight, drawingOffsetX, drawingOffsetY,
  favoriteBarHeight, onOverFavorite, onLeaveFavorite, onFavorite, favoriteTopY,
}) {

  const IMAGE_SIZE = tokens.imageSize.lg;

  const wordCount = typeof text === 'string' ? text.trim().split(/\s+/).length : 0;

  let BASE_BUBBLE_WIDTH;
  if (wordCount === 1) {
    BASE_BUBBLE_WIDTH = 90;
  } else if (wordCount === 2 && (typeof text === 'string') && text.length < 16) {
    BASE_BUBBLE_WIDTH = 110;
  } else {
    BASE_BUBBLE_WIDTH = 170;
  }

  // Bubble geometry for vertical clamp only
  const BUBBLE_HEIGHT_3LINES = 78;      // estimated height for 3 lines of text
  const BUBBLE_PAD_ABOVE_FAVORITE = tokens.spacing.sm;  // keep bubble a bit above the favorite bar
  const EDGE_PAD = 0;


  // Shared values for reanimated
  const translateX = useSharedValue(x);
  const translateY = useSharedValue(y);
  const sharedScale = useSharedValue(scale);
  const sharedRotation = useSharedValue(rotation);

  const bubbleAnimatedStyle = useAnimatedStyle(() => ({
  width: Math.min(BASE_BUBBLE_WIDTH * sharedScale.value, tokens.canvasModal.md),
      }));

  // Keep shared values in sync with props
  React.useEffect(() => { translateX.value = x; }, [x]);
  React.useEffect(() => { translateY.value = y; }, [y]);
  React.useEffect(() => { sharedScale.value = scale; }, [scale]);
  React.useEffect(() => { sharedRotation.value = rotation; }, [rotation]);

  // Clamp logic in onEnd
const panGesture = useAnimatedGestureHandler({
  onStart: (e, ctx) => {
    ctx.startX = translateX.value;
    ctx.startY = translateY.value;
    ctx.wasOverTrash = false;
    ctx.wasOverFavorite = false;
  },

  onActive: (e, ctx) => {
    'worklet';
    // move freely while dragging
    translateX.value = ctx.startX + e.translationX;
    translateY.value = ctx.startY + e.translationY;

    // --- Compute current half height correctly ---
    const MIN_DRAWING_SIZE = 24;
    const currentImageHeight =
      (!isSpeechBubble && isDrawing && drawingHeight)
        ? Math.max(drawingHeight, MIN_DRAWING_SIZE) * sharedScale.value
        : IMAGE_SIZE * sharedScale.value;

    const halfH = currentImageHeight / 2;

    // use the *unclamped* bottom for hover detection
    const proposedBottom = translateY.value + halfH;
    const favoriteTop = parentHeight - favoriteBarHeight - 5;
    const hoverBuffer = -30; // bump to 8–12 if you want earlier hover

    if (!isSpeechBubble) {
      if (proposedBottom > favoriteTop - hoverBuffer) {
        if (!ctx.wasOverFavorite) {
          ctx.wasOverFavorite = true;
          runOnJS(onOverFavorite)?.();
        }
      } else if (ctx.wasOverFavorite) {
        ctx.wasOverFavorite = false;
        runOnJS(onLeaveFavorite)?.();
      }
    }

    // Trash (TOP) check using current translateY
    const topEdge = translateY.value - halfH;
    if (topEdge < trashBarHeight - 160) {
      if (!ctx.wasOverTrash) {
        ctx.wasOverTrash = true;
        runOnJS(onOverTrash)?.();
      }
    } else if (ctx.wasOverTrash) {
      ctx.wasOverTrash = false;
      runOnJS(onLeaveTrash)?.();
    }
  },

  onEnd: (_, ctx) => {
    'worklet';

    // ===== SPEECH BUBBLE =====
    if (isSpeechBubble) {
      const scale = sharedScale.value || 1;
      const halfH = (BUBBLE_HEIGHT_3LINES * scale) / 2;

      // --- Trash delete (use top edge from center) ---
      const topEdge = translateY.value - halfH;
      if (topEdge < trashBarHeight - 160) {
        runOnJS(onDelete)?.();
        runOnJS(onLeaveTrash)?.();
        return;
      }
      runOnJS(onLeaveTrash)?.();

      // --- Clamp bottom above favorite bar ---
      const favTop = (typeof favoriteTopY === 'number')
        ? favoriteTopY
        : ((parentHeight ?? 0) - (favoriteBarHeight ?? 0) - 5);

      const maxCenterY = favTop - BUBBLE_PAD_ABOVE_FAVORITE - halfH;
      if (translateY.value > maxCenterY) {
        translateY.value = maxCenterY;
      }

      // --- Basic screen clamps for center (horizontal & top) ---
      const halfW = Math.min(BASE_BUBBLE_WIDTH * scale, tokens.canvasModal.md) / 2;
      const minCenterX = halfW + EDGE_PAD;
      const maxCenterX = (parentWidth ?? 0) - halfW - EDGE_PAD;
      const minCenterY = halfH + EDGE_PAD;

      let clampedX = Math.max(minCenterX, Math.min(translateX.value, maxCenterX));
      let clampedY = Math.max(minCenterY, translateY.value);

      translateX.value = clampedX;
      translateY.value = clampedY;

      runOnJS(onMove)?.(clampedX, clampedY);
      return; // important: don't fall through to image/drawing logic
    }

    // ===== Images/drawings logic =====
    const MIN_DRAWING_SIZE = 24;
    const currentImageWidth =
      (isDrawing && drawingWidth)
        ? Math.max(drawingWidth, MIN_DRAWING_SIZE) * (sharedScale.value || 1)
        : IMAGE_SIZE * (sharedScale.value || 1);

    const currentImageHeight =
      (isDrawing && drawingHeight)
        ? Math.max(drawingHeight, MIN_DRAWING_SIZE) * (sharedScale.value || 1)
        : IMAGE_SIZE * (sharedScale.value || 1);

    const halfW = currentImageWidth / 2;
    const halfH = currentImageHeight / 2;

    // --- Trash delete ---
    const topEdge = translateY.value - halfH;
    if (topEdge < trashBarHeight - 160) {
      runOnJS(onDelete)?.();
      runOnJS(onLeaveTrash)?.();
      return;
    }
    runOnJS(onLeaveTrash)?.();

    // --- SNAP to favorite line if below it ---
    const favoriteTop = parentHeight - favoriteBarHeight - 5;
    const bottomBeforeSnap = translateY.value + halfH;

    const triggerBuffer = -30;
    if (bottomBeforeSnap >= favoriteTop - triggerBuffer) {
      runOnJS(onFavorite)?.();
      runOnJS(onLeaveFavorite)?.();
    } else {
      runOnJS(onLeaveFavorite)?.();
    }

    const maxTranslateY = favoriteTop - halfH;
    if (translateY.value > maxTranslateY) {
      translateY.value = maxTranslateY;
    }

    // --- Left/Right/Top clamps ---
    const slack = currentImageWidth / 10;
    const minTranslateX = slack;
    const maxTranslateX = parentWidth - slack;
    const minTranslateY = slack;

    let clampedX = Math.max(minTranslateX, Math.min(translateX.value, maxTranslateX));
    let clampedY = Math.max(minTranslateY, translateY.value);
    translateX.value = clampedX;
    translateY.value = clampedY;
    runOnJS(onMove)?.(clampedX, clampedY);
    },

});

  // Pinch for scale
  const MIN_SCALE = 1.0;
  const MAX_SCALE = 4.0;
  const pinchGesture = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startScale = sharedScale.value;
    },
    onActive: (event, ctx) => {
      let newScale = ctx.startScale * event.scale;
      newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
      sharedScale.value = newScale;
    },
    onEnd: () => {
      runOnJS(onScale)?.(sharedScale.value);
    }
  });

  // Rotate
  const ROTATION_SNAP_DEGREES = 45;
  const ROTATION_SNAP_RADIANS = ROTATION_SNAP_DEGREES * (Math.PI / 180);

  const rotateGesture = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startRotation = sharedRotation.value;
    },
    onActive: (event, ctx) => {
      sharedRotation.value = ctx.startRotation + event.rotation;
    },
    onEnd: () => {
      'worklet';
      if (isSpeechBubble) {
        // Snap to nearest increment (e.g., 45°) for bubbles
        const snapped =
          Math.round(sharedRotation.value / ROTATION_SNAP_RADIANS) *
          ROTATION_SNAP_RADIANS;
        sharedRotation.value = snapped;
        runOnJS(onRotate)?.(snapped);
      } else {
        // For images: just set as-is (no snap)
        runOnJS(onRotate)?.(sharedRotation.value);
      }
    }
  });

  const animatedStyle = useAnimatedStyle(() => {
    // Use these for images (not speech bubbles/text):
  const MIN_DRAWING_SIZE = 24;
  const imageWidth = isDrawing && drawingWidth ? Math.max(drawingWidth, MIN_DRAWING_SIZE) * sharedScale.value : IMAGE_SIZE * sharedScale.value;
  const imageHeight = isDrawing && drawingHeight ? Math.max(drawingHeight, MIN_DRAWING_SIZE) * sharedScale.value : IMAGE_SIZE * sharedScale.value;

  if (renderContent && isSpeechBubble) {
    const scale = sharedScale.value || 1;
    const bw = Math.min(BASE_BUBBLE_WIDTH * scale, tokens.canvasModal.md);
    const bh = BUBBLE_HEIGHT_3LINES * scale;

    return {
      position: "absolute",
      left: (translateX.value ?? 0) - bw / 2,
      top: (translateY.value ?? 0) - bh / 2,
      width: bw,
      zIndex: 10,
      transform: [{ rotateZ: `${sharedRotation.value || 0}rad` }],
    };
    } else {
      // For images/drawings: use calculated width/height
      return {
        position: "absolute",
        left: translateX.value - imageWidth / 2,
        top: translateY.value - imageHeight / 2,
        width: imageWidth,
        height: imageHeight,
        zIndex: 10,
        transform: [{ rotateZ: `${sharedRotation.value}rad` }]
      };
    }
  });

  // Handler refs
  const panRef = useRef();
  const pinchRef = useRef();
  const rotateRef = useRef();

  const MIN_GESTURE_WIDTH = tokens.imageSize.sm;
  const MIN_GESTURE_HEIGHT = tokens.imageSize.md;

  const contentSizeStyle = renderContent
    ? { minWidth: MIN_GESTURE_WIDTH, minHeight: MIN_GESTURE_HEIGHT }
    : {};
  
// --- Animated border effect for speech bubble playback ---
const [isPlaying, setIsPlaying] = useState(false);
const borderAnimated = useSharedValue(0);

useEffect(() => {
  if (isPlaying) {
    borderAnimated.value = withRepeat(
      withTiming(1, { duration: 1200 }),
      -1, // Infinite
      false
    );
  } else {
    borderAnimated.value = withTiming(0, { duration: 400 });
  }
}, [isPlaying]);

const animatedBorderStyle = useAnimatedStyle(() => {
  const t = borderAnimated.value;

  if (!isPlaying) {
    // Default black border when not playing
    return { borderColor: '#000' };
  }

  // Light grey start color (#ccc)
  const startR = 204;
  const startG = 204;
  const startB = 204;

  // Mic button color (#FFB86B)
  const micR = 0xFF;
  const micG = 0xB8;
  const micB = 0x6B;

  const r = Math.round(startR + (micR - startR) * t);
  const g = Math.round(startG + (micG - startG) * t);
  const b = Math.round(startB + (micB - startB) * t);

  const borderColor = `rgb(${r},${g},${b})`;

  return {
    borderColor,
  };
});

return (
  <PanGestureHandler
    ref={panRef}
    simultaneousHandlers={[pinchRef, rotateRef]}
    onGestureEvent={panGesture}
  >
    <Animated.View style={[animatedStyle, contentSizeStyle]}>
      <RotationGestureHandler
        ref={rotateRef}
        simultaneousHandlers={[panRef, pinchRef]}
        onGestureEvent={rotateGesture}
      >
        <Animated.View style={{  }}>
          <PinchGestureHandler
            ref={pinchRef}
            simultaneousHandlers={[panRef, rotateRef]}
            onGestureEvent={pinchGesture}
          >
            <Animated.View style={{

              justifyContent: "center",
              alignItems: "center"
            }}>
              {renderContent ? (
                <Animated.View style={[
                  bubbleAnimatedStyle,
                  animatedBorderStyle,
                  {
                    backgroundColor: "#fff",
                    borderRadius: tokens.radius.lg,
                    borderWidth: 2,
                    paddingHorizontal: tokens.spacing.sm,
                    paddingVertical: tokens.spacing.xs,
                    alignItems: "center",
                    justifyContent: "center",
                    margin: tokens.spacing.xs,
                    alignSelf: "flex-start",
                    overflow: "hidden",
                  },
                ]}>
                  {renderContent({
                    textProps: {
                      style: {
                        color: "#28394e",
                        fontSize: tokens.fontSize.subheading,
                        textAlign: "center",
                      },
                      numberOfLines: 3,
                      ellipsizeMode: "tail",
                    },
                    onPlaybackStart: () => setIsPlaying(true),
                    onPlaybackEnd: () => setIsPlaying(false),
                  })}
                </Animated.View>
              ) : (
                <Animated.Image
                  source={source}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="contain"
                />
              )}
            </Animated.View>
          </PinchGestureHandler>
        </Animated.View>
      </RotationGestureHandler>
    </Animated.View>
  </PanGestureHandler>
);
}

// Storyboard screen
function StoryboardScreen({ setTab, setLastStoryboardTab, bottomTab, pageState, updatePageState, onAddPage, onUseCamera, onUnlockCamera, onClearCamera, renderOptionRight, canAddToPage, wandPagerIndexRef, onPromptChange }) {
  
  const [canvasY, setCanvasY] = useState(0);
  const [favoriteBarY, setFavoriteBarY] = useState(0);

  const storyboardRecordingRef = useRef(null);

  // Global History hooks
  const { addImageLine, addSpeechLine, registerCurrentPageHandlers, setFavoriteBarMetrics, setTrashBarMetrics, clearNoImageFromHistory, metrics } = useHistory();

  // Max Image and Speech Bubble helpers
  function isAtPageCap() {
    if (typeof canAddToPage === 'function') {
      return !canAddToPage(bottomTab);
    }
    // Fallback if prop not passed: compute from this page's state
    const eligible = (pageState?.placedImages || []).filter(
      it => it?.type === 'image' || it?.type === 'speech'
    ).length;
    return eligible >= MAX_ITEMS_PER_PAGE;
  }

  function guardPageCapOrAlert() {
    if (isAtPageCap()) {
      Alert.alert(
        "Limit reached",
        `You can place up to ${MAX_ITEMS_PER_PAGE} items (images + speech bubbles) on this page. Drag an item to the trash to add a new one`
      );
      return false;
    }
    return true;
  }

  // --- Background selection derived from pageState ---
const bgIdx  = Number.isInteger(pageState?.bgIdx)  ? pageState.bgIdx  : 0;
const altIdx = Number.isInteger(pageState?.altIdx) ? pageState.altIdx : 0;

// Flat backgrounds source
const backgroundsFlat = imagePacks.backgrounds;

// Current selected background object
const selectedBg = useMemo(
  () => backgroundsFlat.find(o => o.bgIdx === bgIdx && o.altIdx === altIdx),
  [backgroundsFlat, bgIdx, altIdx]
);

// Main options = all altIdx 0 backgrounds, including "Use Camera"
const mainOptions = useMemo(
  () => backgroundsFlat.filter(o => o.altIdx === 0),
  [backgroundsFlat]
);

const altOptions = useMemo(() => {
  // If main selection is Camera
  if (bgIdx === -1) {
    return [{
      key: 'camera-alt',
      isCamera: true,
      label: '1',
      img: pageState?.cameraBgUri
        ? { uri: pageState.cameraBgUri }
        : null,
      bgIdx: -1,
      altIdx: 0,
    }];
  }

  // Otherwise: your original behavior
  return backgroundsFlat
    .filter(o => o.bgIdx === bgIdx)
    .map(o => ({ ...o, label: String(o.altIdx + 1) }));
}, [backgroundsFlat, bgIdx, pageState?.cameraBgUri]);


  // Flatten imagePacks to a single array with 'pack' info
  const allAssets = Object.entries(imagePacks).flatMap(([pack, items]) =>
    items.map(img => ({
      ...img,
      pack
    }))
  );

    // Data for filtering
  const [allPages, setAllPages] = useState([]); // Start with empty array or load from props/db
  const [filteredPages, setFilteredPages] = useState([]);

  useEffect(() => {
    setAllPages(allAssets);        // load all assets on mount
    setFilteredPages(allAssets);   // display all by default
  }, []);

  // Your search handler
  const handleSearch = (text) => {
  const lower = text.toLowerCase();
  setFilteredPages(
    allPages.filter(img =>
      (img.label && img.label.toLowerCase().includes(lower)) ||
      (img.pack && img.pack.toLowerCase().includes(lower))
      )
    );
  };

  const searchBarRef = useRef(null);
  const [query, setQuery] = useState('');

  //Pulsing Wand/Mic Button
  const [currentButton, setCurrentButton] = useState(null); // "wand" or "mic"
  const pulseScale = useSharedValue(1);

  // Ref to control the FlatList (for scrollToOffset on restore)
  const wandPagerRef = useRef(null);

  // Helper: width of one page (same as your snapToInterval)
  const PAGER_ITEM_WIDTH = tokens.button['3xl'];

  //Pagination dots
  const [activeIndex, setActiveIndex] = useState(0);

  const [defaultPrompt, setDefaultPrompt] = useState('Press the wand and say "elephant"!');

    useEffect(() => {
    if (activeIndex === 0) {
      setDefaultPrompt('Press the wand and say "elephant"!');
    } else if (activeIndex === 1) {
      setDefaultPrompt('Press the mic and say "once upon a time..."');
    } else if (activeIndex === 2) {
      setDefaultPrompt('Press the brush to paint!');
    }
  }, [activeIndex]);

  // Notify global bar whenever the prompt changes
  useEffect(() => {
    onPromptChange?.(defaultPrompt);
  }, [defaultPrompt, onPromptChange]);

    // Image recording
  const [isRecordingSession, setIsRecordingSession] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  //Storybook recording logic
   async function startStoryboardRecording() {
    if (storyboardRecordingRef.current) {
    // Already recording, don't start another!
    console.log('Already recording, skipping start');
    return;
  }
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Cannot record without permission.');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );
      storyboardRecordingRef.current = recording;
      console.log('Recording started, ref set:', recording);
    } catch (err) {
      Alert.alert('Error', 'Failed to start recording.\n\n' + err.message);
      storyboardRecordingRef.current = null;
    }
  }

  async function stopStoryboardRecording() {
    if (!storyboardRecordingRef.current) return null;
    try {
      await storyboardRecordingRef.current.stopAndUnloadAsync();
      const uri = storyboardRecordingRef.current.getURI();
      storyboardRecordingRef.current = null;
      console.log('Audio file URI:', uri);
      return uri;
    } catch (err) {
      Alert.alert('Error', 'Failed to stop recording.\n\n' + err.message);
      storyboardRecordingRef.current = null;
      return null;
    }
  }

  // AssemblyAI endpoint
    const ASSEMBLY_API = 'https://api.assemblyai.com/v2';

  // AssemblyAI - speech to text
    const apiKey = 'b85bac65733841cf89f986f8bfe076f8';

  // 1. Upload the audio file to AssemblyAI
  async function uploadAudioAsync(localUri, apiKey) {
    const uploadUrl = `${ASSEMBLY_API}/upload`;
    const result = await FileSystem.uploadAsync(uploadUrl, localUri, {
      httpMethod: 'POST',
      headers: {
        'authorization': apiKey,
        'transfer-encoding': 'chunked',
        'content-type': 'application/octet-stream',
      },
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    });

    const data = JSON.parse(result.body);
    return data.upload_url;
  }

  // 2. Request transcription from AssemblyAI
  async function requestTranscriptAsync(audioUrl, apiKey) {
    const response = await fetch(`${ASSEMBLY_API}/transcript`, {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ audio_url: audioUrl }),
    });
    const data = await response.json();
    console.log('AssemblyAI raw response:', data);
    return data.id; // transcript_id
  }

  // 3. Poll for transcript result
  async function pollTranscriptAsync(transcriptId, apiKey, maxTries = 30, intervalMs = 2000) {
    for (let i = 0; i < maxTries; i++) {
      const response = await fetch(`${ASSEMBLY_API}/transcript/${transcriptId}`, {
        headers: { 'authorization': apiKey }
      });
      const data = await response.json();
      console.log('AssemblyAI raw response:', data);
      if (data.status === 'completed') return data.text;
      if (data.status === 'error') throw new Error('Transcription failed: ' + data.error);
      await new Promise(res => setTimeout(res, intervalMs));
    }
    throw new Error('Transcription polling timed out');
  }

  // Convenience wrapper: handles the full flow
  async function transcribeLocalAudioFile(localUri, apiKey) {
    const audioUrl = await uploadAudioAsync(localUri, apiKey);
    const transcriptId = await requestTranscriptAsync(audioUrl, apiKey);
    const transcript = await pollTranscriptAsync(transcriptId, apiKey);
    return transcript;
  }

  // 1. Synonym map
  const SYNONYMS = {
    profile: "side",
    sideways: "side",
    turn: "side",
    rear: "back",
    behind: "back",
    forward: "front",
    face: "front",
    // Add more as needed
  };

  // 2. Expand synonym function
  function expandSynonyms(words) {
    return words.map(word => SYNONYMS[word] || word);
  }

  // 3. Normalize function
  function normalize(str) {
    return str.toLowerCase().replace(/[^\w\s]/g, '').trim();
  }

  // 4. Matcher function
  function findBestAssetMatch(query, assetsObj) {
    const nQuery = normalize(query);
    let queryWords = nQuery.split(' ');
    queryWords = expandSynonyms(queryWords);

    let best = null;
    let bestHits = 0;

    Object.values(assetsObj).forEach(assetArr => {
      assetArr.forEach(asset => {
        let labelWords = normalize(asset.label).split(' ');
        labelWords = expandSynonyms(labelWords);

        let hits = labelWords.filter(word => queryWords.includes(word)).length;
        if (hits > bestHits) {
          bestHits = hits;
          best = asset;
        }
      });
    });

    return best; // { label, img }
  }

    // --- Timeout Setup for Wand and Mic buttons ---
  const RECORD_TIMEOUT_MS = 8_000; // 8 seconds (or your preferred max)
  const recordTimeoutRef = useRef(null); // Handles both buttons (can be separate if you want)

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const [trashActive, setTrashActive] = useState(false);
  const [favoriteActive, setFavoriteActive] = useState(false);

  // State to keep star yellow for 2s after favoriting
  const [starGlow, setStarGlow] = useState(false);

  // Animation shared value for bounce/grow
  const starScale = useSharedValue(1);

  // Helper to trigger the animation and yellow-glow
  const triggerStarBounce = () => {
    setStarGlow(true);

    // First (largest) bounce
    starScale.value = withSpring(1.5, { damping: 1.5 }, () => {
      // Snap back past 1
      starScale.value = withSpring(1, { damping: 10 }, () => {     
      });
    });

    setTimeout(() => setStarGlow(false), 1700); // Yellow for 1 second
  };


  const { favorites, setFavorites } = useFavorites();

const addToFavorites = (imgObj) => {
  if (!imgObj?.img) return; // guard: must have an image

  const finalObj = {
    ...imgObj,
    // guarantee a stable label (critical for history)
    label: imgObj.label || imgObj.name || imgObj.word || imgObj.id || "Unnamed",
    // keep name too, with sensible fallbacks
    name: imgObj.name || imgObj.label || imgObj.word || "Unnamed",
    description: imgObj.description || "",
    isBackground: !!imgObj.isBackground, // usually false for drag-to-star
  };

  setFavorites((favs) =>
    favs.some(fav => fav.img === finalObj.img) ? favs : [...favs, finalObj]
  );

  triggerStarBounce();
};

  const animatedStarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: starScale.value }],
  }));

  // Image/Speech Generation Canvas Padding - Boundary
  const { history, favorite } = metrics;
  const SAFE_PADDING_TOP = (tokens.barHeight.md * 2) + tokens.spacing['4xl'];
  const SAFE_PADDING_BOTTOM = Math.max(tokens.barHeight.md * 5, history.height + favorite.height + tokens.spacing['2xl']);
  const SAFE_PADDING_SIDES = tokens.spacing['4xl'] + tokens.spacing.sm;

  const randWithinInc = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const pickRandomCanvasPoint = useCallback(() => {
  const x = canvasSize?.width
    ? randWithinInc(
        SAFE_PADDING_SIDES,
        Math.max(SAFE_PADDING_SIDES + 1, canvasSize.width - SAFE_PADDING_SIDES)
      )
    : 120;

  const y = canvasSize?.height
    ? randWithinInc(
        SAFE_PADDING_TOP,
        Math.max(SAFE_PADDING_TOP + 1, canvasSize.height - SAFE_PADDING_BOTTOM)
      )
    : 180;

  return { x, y };
}, [
  canvasSize?.width, canvasSize?.height,]);

  // Handler for dropping history bubble to canvas as a speech bubble
  const handleDropToCanvas = (line, x, y, audioUri) => {
    if (typeof line !== 'string' || !line.trim()) return;

    const { x: rx, y: ry } = pickRandomCanvasPoint();
    const finalX = (typeof x === "number") ? x : rx;
    const finalY = (typeof y === "number") ? y : ry;

    if (!guardPageCapOrAlert()) return;
    updatePageState(prev => ({
      ...prev,
      placedImages: [
        ...(prev.placedImages || []),
        {
          id: Date.now() + Math.random(),
          type: "speech",
          text: String(line).trim(),
          x: finalX - 40,
          y: finalY - 20,
          rotation: 0,
          scale: 1,
          audioUri: audioUri || null,
        }
      ]
    }));
  };

  // OnPress logic to generate an image from the bubble (MIC = speech, WAND = image)
  const onTapLogic = useCallback((line, source, audioUri, opts = {}) => {
    const { addToHistory = true } = opts;
  // ---- MIC path → adds a SPEECH bubble ----
  if (source === "mic") {
    if (!guardPageCapOrAlert()) return;
    if (typeof line !== 'string' || !line.trim()) return;

    const { x, y } = pickRandomCanvasPoint();
    updatePageState(prev => ({
      ...prev,
      placedImages: [
        ...(prev.placedImages || []),
        {
          id: Date.now() + Math.random(),
          type: "speech",
          text: String(line).trim(),
          x,
          y,
          rotation: 0,
          scale: 1,
          audioUri: audioUri || null,
        }
      ]
    }));
    return;
  }

  // WAND path
  const bestMatch = findBestAssetMatch(line, imagePacks);
  if (!bestMatch) {
    if (addToHistory) addImageLine("No Image!");
    return;
  }

  if (addToHistory) {
    // only write to global history if not tapped from history
    addImageLine(bestMatch.label, bestMatch.img); // see note below about storing img
  }

  // Canvas placement
  if (!guardPageCapOrAlert()) return;

  if (!canvasSize?.width || !canvasSize?.height) {
    const { x, y } = pickRandomCanvasPoint();
    updatePageState(prev => ({
      ...prev,
      placedImages: [
        ...(prev.placedImages || []),
        {
          id: Date.now() + Math.random(),
          img: bestMatch.img,
          word: bestMatch.label,
          name: bestMatch.label || line || "Unknown",
          description: bestMatch.description || "",
          x, y,
          rotation: 0,
          scale: 1,
          type: 'image',
        }
      ]
    }));
    return;
  }

  const lastImage = (pageState.placedImages || [])
    .filter(img => img.word === bestMatch.label)
    .slice(-1)[0];

  const minX = 40;
  const maxX = Math.max(minX + 1, canvasSize.width - 80);
  const minY = SAFE_PADDING_TOP;
  const maxY = Math.max(minY + 1, canvasSize.height - SAFE_PADDING_BOTTOM);

  let newX, newY;
  if (lastImage) {
    const offset = () => Math.floor(Math.random() * 81) - 40;
    newX = Math.max(minX, Math.min(lastImage.x + offset(), maxX));
    newY = Math.max(minY, Math.min(lastImage.y + offset(), maxY));
  } else {
    newX = randWithinInc(minX, maxX);
    newY = randWithinInc(minY, maxY);
  }

  updatePageState(prev => ({
    ...prev,
    placedImages: [
      ...(prev.placedImages || []),
      {
        id: Date.now() + Math.random(),
        img: bestMatch.img,
        word: bestMatch.label,
        name: bestMatch.label || line || "Unknown",
        description: bestMatch.description || "",
        x: newX,
        y: newY,
        rotation: 0,
        scale: 1,
        type: 'image',
      }
    ]
  }));
}, [
  // deps used inside onTapLogic:
  addImageLine,
  imagePacks,
  pageState?.placedImages,      // if this re-triggers too often, consider a ref instead
  canvasSize?.width,
  canvasSize?.height,
  pickRandomCanvasPoint,
  updatePageState,
]);

useEffect(() => {
  const unregister = registerCurrentPageHandlers({
    onTapLine: (line, source, audioUri, fromHistory = false) => {
      const mapped = source === "speech" ? "mic" : "wand";
      onTapLogic(line, mapped, audioUri, { addToHistory: !fromHistory });
    },
  });
  return unregister;
}, [registerCurrentPageHandlers, onTapLogic]);

// Floating Animated Brush States  
const [fabOpen, setFabOpen] = useState(false);
const [fabOrigin, setFabOrigin] = useState({ x: 0, y: 0 });
const brushRef = useRef();

const handleBrushPress = () => {
  if (fabOpen) {
    setFabOpen(false);
  } else if (brushRef.current) {
    brushRef.current.measureInWindow((pageX, pageY, width, height) => {
      setFabOrigin({
        x: pageX + width / 2,
        y: pageY - height + tokens.barHeight.md + tokens.spacing["3xl"],
      });
      setFabOpen(true);
    });
  }
};

//Brush Drawing Function
const [isDrawing, setIsDrawing] = useState(false); // Is drawing mode on?
const [tool, setTool] = useState('brush');

const drawingBrushRef = useRef();

const handleCommitDrawing = async () => {
    console.log("handleCommitDrawing called");
  if (drawingBrushRef.current && drawingBrushRef.current.commit) {
    await drawingBrushRef.current.commit();
    // Only hide after commit finishes!
    setIsDrawing(false);
  } else {
    setIsDrawing(false);
  }
};

// This effect triggers when FAB is closed while drawing mode is on
useEffect(() => {
  if (!fabOpen && isDrawing) {
    handleCommitDrawing();
  }
}, [fabOpen, isDrawing]);

const [brushColor, setBrushColor] = useState("#BA55D3");
const [brushWidth, setBrushWidth] = useState(5);
const canvasWidth = tokens.canvasModal.md;
const canvasHeight = tokens.canvasModal.lg;

//Button Styles
const DEFAULT_ICONS = [
 <Ionicons name="color-palette" size={tokens.iconSize.xl} color="#BA55D3" />,
 <MaterialCommunityIcons name="pencil" size={tokens.iconSize.xl} color="#BA55D3" />,
 <MaterialIcons name="brush" size={tokens.iconSize.xl} color="#BA55D3" />,
 <FontAwesome5 name="highlighter" size={tokens.iconSize.lg} color="#BA55D3" />,
 <MaterialCommunityIcons name="eraser" size={tokens.iconSize.xl} color="#BA55D3" />,
 <MaterialCommunityIcons name="gesture" size={tokens.iconSize.xl} color="#BA55D3" />,
];

//Button Function
 const DEFAULT_ACTIONS = [
   () => {},                                  // Color palette
   () => setTool('pencil'),                   // Pencil
   () => { setTool('brush'); setIsDrawing(true); },  // Brush
   () => setTool('highlighter'),              // Highlighter
   () => setTool('eraser'),                   // Eraser
   () => {},                                  // Change width
 ];

// --- Guards to prevent double start/stop races ---
const isStoppingRef = useRef(false);

// Call this when Wand/Mic recording ends (manual or auto)
const clearRecordingTimeout = () => {
  if (recordTimeoutRef.current) {
    clearTimeout(recordTimeoutRef.current);
    recordTimeoutRef.current = null;
  }
};

// MANUAL stop (call this from your mic button stop handler)
const stopRecordingNow = async () => {
  if (isStoppingRef.current) return;
  isStoppingRef.current = true;

  try {
    // show spinner *before* awaiting stop to avoid "stuck" UI
    setIsTranscribing(true);
    setIsRecordingSession(false);

    const uri = await stopStoryboardRecording();   // <- must resolve even if no audio
    await handleRecordingFinished(uri);
  } catch (e) {
    console.warn('stopRecordingNow error:', e);

  } finally {
    isStoppingRef.current = false;
  }
};

// Called when Wand/Mic auto-timed out
const autoStopRecording = async () => {
  if (isStoppingRef.current) return;
  isStoppingRef.current = true;

  try {
    setIsTranscribing(true);
    setIsRecordingSession(false);

    const uri = await stopStoryboardRecording();
    await handleRecordingFinished(uri);
  } catch (e) {
    console.warn('autoStopRecording error:', e);
  } finally {
    isStoppingRef.current = false;
  }
};

async function handleRecordingFinished(uri) {
  try {
    if (uri) {
      const text = await transcribeLocalAudioFile(uri, apiKey);

      if (currentButton === "wand") {
        const bestMatch = findBestAssetMatch(text, imagePacks);

        if (!bestMatch) {
          // history only
          addImageLine("No Image!");
          return;
        }

        // 1) history
        addImageLine(bestMatch.label, bestMatch.img);

        // 2) canvas placement (cap + coords)
        if (!guardPageCapOrAlert()) return;

        if (!canvasSize?.width || !canvasSize?.height) {
          const { x, y } = pickRandomCanvasPoint();
          updatePageState(prev => ({
            ...prev,
            placedImages: [
              ...(prev.placedImages || []),
              {
                id: Date.now() + Math.random(),
                img: bestMatch.img,
                word: bestMatch.label,
                name: bestMatch.label || text || "Unknown",
                description: bestMatch.description || "",
                x, y,
                rotation: 0,
                scale: 1,
                type: "image",
              }
            ]
          }));
          return;
        }

        const lastImage = (pageState.placedImages || [])
          .filter(img => img.word === bestMatch.label)
          .slice(-1)[0];

        const minX = 40;
        const maxX = Math.max(minX + 1, canvasSize.width - 80);
        const minY = SAFE_PADDING_TOP;
        const maxY = Math.max(minY + 1, canvasSize.height - SAFE_PADDING_BOTTOM);

        let newX, newY;
        if (lastImage) {
          const offset = () => Math.floor(Math.random() * 81) - 40;
          newX = Math.max(minX, Math.min(lastImage.x + offset(), maxX));
          newY = Math.max(minY, Math.min(lastImage.y + offset(), maxY));
        } else {
          newX = randWithinInc(minX, maxX);
          newY = randWithinInc(minY, maxY);
        }

        updatePageState(prev => ({
          ...prev,
          placedImages: [
            ...(prev.placedImages || []),
            {
              id: Date.now() + Math.random(),
              img: bestMatch.img,
              word: bestMatch.label,
              name: bestMatch.label || text || "Unknown",
              description: bestMatch.description || "",
              x: newX,
              y: newY,
              rotation: 0,
              scale: 1,
              type: "image",
            }
          ]
        }));

        return;
      }

      if (currentButton === "mic") {
        const cleaned = text.replace(/[.,]/g, '').toLowerCase();

        // 1) history
        addSpeechLine(cleaned, uri);

        // 2) canvas
        handleDropToCanvas(cleaned, undefined, undefined, uri);
      }
    } else {
      // no URI case
      if (currentButton === "wand") {
        addImageLine('No audio captured');
      } else if (currentButton === "mic") {
        addSpeechLine('No audio captured');
      }
    }
  } catch (err) {
    console.warn('handleRecordingFinished error:', err);
    if (currentButton === "wand") {
      addImageLine('Transcription failed');
    } else if (currentButton === "mic") {
      addSpeechLine('Transcription failed');
    }
  } finally {
    setIsTranscribing(false);
    setIsRecordingSession(false);
    clearRecordingTimeout();
  }
}

// Wand/Mic pulsing during recording
const pulsingStyle = useAnimatedStyle(() => ({
  transform: [{ scale: pulseScale.value }],
}));

const startPulse = () => {
  pulseScale.value = withRepeat(
    withSequence(
      withTiming(1.12, { duration: 400 }),
      withTiming(0.92, { duration: 400 }),
      withTiming(1, { duration: 400 })
    ),
    -1,
    true
  );
};

const stopPulse = () => {
  cancelAnimation(pulseScale);
  pulseScale.value = 1;
};

useEffect(() => {
  if (isRecordingSession || isTranscribing) startPulse();
  else stopPulse();
}, [isRecordingSession, isTranscribing]);


// ——— Derived layout lines ———
const favoriteTopLocal = Math.max(0, favoriteBarY - canvasY); // canvas-space Y for the line



  return (
    <View style={{ flex: 1, position: 'relative' }}>
      {/* Background */}
      {pageState.background && (
        <Image
          source={pageState.background}
          style={styles.background}
          resizeMode="cover"
        />
      )}

      {/* Trash bar (top) */}
      <View
        style={{
          width: '100%',
          height: tokens.barHeight.md,
          backgroundColor: '#f4f7fb',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
          borderBottomWidth: 1,
          borderBottomColor: '#e5e5e5'
        }}
          onLayout={e => {
            const h = e.nativeEvent.layout.height;
            const y = e.nativeEvent.layout.y + h;
            setTrashBarMetrics(h, y);
          }}
        >
        {/* Home Button */}
        <TouchableOpacity
          onPress={() => setTab('home')}
          style={{
            position: 'absolute',
            left: tokens.spacing["4xl"],
            borderRadius: tokens.radius.md,
            backgroundColor: 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
          hitSlop={12}
        >
          <Ionicons name="home" size={tokens.iconSize.lg} color="#28394e" />
        </TouchableOpacity>
        <Ionicons name="trash" size={tokens.iconSize.lg} color={trashActive ? "#c00" : "#b0b0b0"} />
      </View>

      {/* New page button */}
      <TouchableOpacity
        onPress={onAddPage}
        style={{
          position: 'absolute',
          paddingTop: tokens.spacing.lg,
          right: tokens.spacing["4xl"],
          borderRadius: tokens.radius.md,
          backgroundColor: 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
        }}
        hitSlop={12}
      >
        <Ionicons name="duplicate-outline" size={tokens.iconSize.lg} color="#38b6ff" />
      </TouchableOpacity>

      {/* Animated Search Bar */}
      <View style={{ width: '100%', paddingVertical: tokens.spacing.xs, backgroundColor: 'transparent', zIndex: 90 }}>
        <ModernSearchBar
          ref={searchBarRef}
          query={query}
          setQuery={setQuery}
          onSearch={handleSearch}
        />
      </View>

     {query.length > 0 && (
      <View
        style={{
          position: 'absolute',
          top: tokens.barHeight.md * 2,
          left: 0,
          right: 0,
          zIndex: 200,
          marginHorizontal: tokens.spacing["2xl"],
          backgroundColor: '#f4f7fb',
          borderTopLeftRadius: tokens.radius.lg,
          borderTopRightRadius: tokens.radius.lg,
          borderBottomLeftRadius: tokens.radius.lg,
          borderBottomRightRadius: tokens.radius.lg,
          maxHeight: tokens.canvasModal.md,
          shadowColor: "#000",
          shadowOpacity: 0.07,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        }}>
        <FlatList
          data={filteredPages}
          keyExtractor={(item, idx) => item.pack + '_' + item.label + '_' + idx}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={async () => {
                if (item.pack === "backgrounds") {
                  // ✅ Special-case Camera item (isCamera or bgIdx === -1)
                  if (item.isCamera || item.bgIdx === -1) {
                    const uri = pageState?.cameraBgUri;

                    if (uri) {
                      // Reuse the saved camera photo
                      updatePageState(prev => ({
                        ...prev,
                        bgIdx: -1,
                        altIdx: 0,
                        background: { uri },
                        cameraLocked: true,
                      }));

                      // Keep rehydrate behavior consistent (optional)
                      try {
                        await AsyncStorage.setItem('cameraBgUri', uri);
                        await AsyncStorage.setItem('cameraBgLocked', '1');
                      } catch (e) {}
                    } else {
                      // No photo yet → open camera (same as your dropdown path)
                      if (typeof onUseCamera === 'function') {
                        // small delay is often safer if a modal is closing; OK to omit if unneeded
                        setTimeout(() => onUseCamera(), 150);
                      }
                    }

                    // close search UI
                    setQuery('');
                    searchBarRef.current?.close();
                    return;
                  }

                  // Normal background (unchanged)
                  updatePageState(prev => ({
                    ...prev,
                    bgIdx: item.bgIdx,
                    altIdx: item.altIdx,
                    background: item.img,
                    cameraLocked: false,
                  }));
                  if (typeof onUnlockCamera === 'function') onUnlockCamera();

                  setQuery('');
                  searchBarRef.current?.close();
                } else {
                  // (unchanged) Add image to canvas...
                  const scatterRadius = 200;
                  const randOffset = () => Math.floor(Math.random() * scatterRadius) - scatterRadius / 2;

                  const safePaddingTop = (tokens.barHeight.md * 2) + tokens.spacing['4xl'];
                  const safePaddingBottom = tokens.barHeight.md * 5;
                  const safePaddingSides = tokens.spacing['4xl'] + tokens.spacing.sm;

                  const x = canvasSize.width
                    ? Math.max(
                        safePaddingSides,
                        Math.min(canvasSize.width - safePaddingSides, canvasSize.width / 2 + randOffset())
                      )
                    : 120;

                  const y = canvasSize.height
                    ? Math.max(
                        safePaddingTop,
                        Math.min(canvasSize.height - safePaddingBottom, canvasSize.height / 2 + randOffset())
                      )
                    : 180;

                  // Max image/speech bubbles check
                  if (!guardPageCapOrAlert()) {
                    // Still update transcript to reflect the tap, but don't add canvas item
                    addImageLine(item.label);
                    setQuery('');
                    searchBarRef.current?.close();
                    return;
                  }

                  // proceed with image add
                  updatePageState(prev => ({
                    ...prev,
                    placedImages: [
                      ...(prev.placedImages || []),
                      {
                        id: Date.now() + Math.random(),
                        img: item.img,
                        word: item.label,
                        name: item.label || item.name || item.word || "Unknown",
                        description: item.description || "",
                        x, y, rotation: 0, scale: 1,
                        type: 'image',
                      },
                    ],
                    }));
                  addImageLine(item.label);
                  setQuery('');
                  searchBarRef.current?.close();
                }
              }}


              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: tokens.spacing.sm,
                backgroundColor: '#fff',
                borderRadius: tokens.radius.md,
                marginVertical: tokens.spacing.xs,
                marginHorizontal: tokens.spacing.sm,
              }}
            >
              {/* thumbnail (supports camera item too) */}
              {item.img ? (
                <Image
                  source={item.img}
                  style={{
                    width: tokens.imageSize.sm,
                    height: tokens.imageSize.sm,
                    marginRight: tokens.spacing.sm,
                    borderRadius: tokens.radius.sm
                  }}
                />
              ) : item.isCamera && pageState?.cameraBgUri ? (
                // Show camera photo thumbnail even if the asset's img is null
                <Image
                  source={{ uri: pageState.cameraBgUri }}
                  style={{
                    width: tokens.imageSize.sm,
                    height: tokens.imageSize.sm,
                    marginRight: tokens.spacing.sm,
                    borderRadius: tokens.radius.sm
                  }}
                />
              ) : item.isCamera ? (
                // Fallback: same camera icon you use elsewhere
                <View
                  style={{
                    width: tokens.imageSize.sm,
                    height: tokens.imageSize.sm,
                    marginRight: tokens.spacing.sm,
                    borderRadius: tokens.radius.sm,
                    backgroundColor: '#eef2f7',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Ionicons name="camera-outline" size={tokens.iconSize.md} color="#778399" />
                </View>
              ) : null}

              <Text>{item.label}</Text>
              <Text style={{ marginLeft: tokens.spacing.sm, color: '#aaa', fontSize: tokens.fontSize.caption }}>{item.pack}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    )}

      {/* Drawing - Brush */}
     <DrawingBrush
      ref={drawingBrushRef}
      visible={isDrawing}
      brushColor={brushColor}
      brushWidth={brushWidth}
      tool={tool}
      canvasWidth={canvasWidth}
      canvasHeight={canvasHeight}
      onComplete={async result => {
        console.log("DEBUG DrawingBrush result:", result);
        if (!result || !result.image) {
          console.log("[DrawingBrush onComplete] No image to commit!");
          return;
        }
        try {
          // Skia: get base64 dataUrl
          console.log("DEBUG DrawingBrush result:", result);
          const base64 = result.image.encodeToBase64?.();
          const dataUrl = `data:image/png;base64,${base64}`;
          console.log("DEBUG DrawingBrush dataUrl:", dataUrl); // After dataUrl is created
          updatePageState(prev => {
            const x = userOpenedAtX + result.drawingOffsetX;
            const y = userOpenedAtY + result.drawingOffsetY;
            const nextPlaced = [
              ...(prev.placedImages || []),
              {
                id: Date.now() + Math.random(),
                img: dataUrl,
                x,
                y,
                scale: 1,
                rotation: 0,
                type: 'drawing',
                drawingWidth: result.drawingWidth,
                drawingHeight: result.drawingHeight,
                drawingOffsetX: result.drawingOffsetX,
                drawingOffsetY: result.drawingOffsetY,
                // Optionally store paths, color, etc. for future editing
              }
            ];
              console.log("DEBUG placedImages after commit:", nextPlaced);
            return { ...prev, placedImages: nextPlaced };
          });
        } catch (err) {
          console.log("[DrawingBrush onComplete] ERROR!", err);
        }
      }}

    />

      {/* Render images on canvas */}
      <View
        style={{ flex: 1 }}
        onLayout={e => {
          const { width, height, y } = e.nativeEvent.layout;
          setCanvasSize({ width, height });
          setCanvasY(y);
        }}
      >
        {(pageState.placedImages || []).map((img, idx) => {
          if (!img) return null;

          // Defensive: warn if a speech bubble is missing text
          if (img.type === 'speech' && typeof img.text !== 'string') {
            console.warn('Speech bubble without valid text:', img);
            return null;
          }

          // Render speech bubbles with valid text property
          if (img.type === 'speech' && typeof img.text === 'string') {
            return (
              <DraggableImage
                key={img.id}
                text={img.text}
                isSpeechBubble={true}
                renderContent={({ textProps, onPlaybackStart, onPlaybackEnd }) => (
                  <SpeechBubble
                    text={img.text}
                    audioUri={img.audioUri}
                    textProps={textProps}
                    onPlaybackStart={onPlaybackStart}
                    onPlaybackEnd={onPlaybackEnd}
                  />
                )}
                x={img.x}
                y={img.y}
                rotation={img.rotation ?? 0}
                scale={img.scale ?? 1}
                onMove={(newX, newY) => {
                  updatePageState(prev => ({
                    ...prev,
                    placedImages: prev.placedImages.map(p =>
                      p.id === img.id ? { ...p, x: newX, y: newY } : p
                    )
                  }));
                }}
                onRotate={newRotation => {
                  updatePageState(prev => ({
                    ...prev,
                    placedImages: prev.placedImages.map(p =>
                      p.id === img.id ? { ...p, rotation: newRotation } : p
                    )
                  }));
                }}
                onScale={newScale => {
                  updatePageState(prev => ({
                    ...prev,
                    placedImages: prev.placedImages.map(p =>
                      p.id === img.id ? { ...p, scale: newScale } : p
                    )
                  }));
                }}
                parentWidth={canvasSize.width}
                parentHeight={canvasSize.height}
                favoriteTopY={Math.max(0, metrics.favorite.absY - canvasY)}
                trashBarHeight={metrics.trash.height}
                onOverTrash={() => setTrashActive(true)}
                onLeaveTrash={() => setTrashActive(false)}
                onDelete={() => {
                  updatePageState(prev => ({
                    ...prev,
                    placedImages: prev.placedImages.filter(p => p.id !== img.id)
                  }));
                  setTrashActive(false);
                }}
              />
            );
          }

          return (
            <DraggableImage
              key={img.id}
              isSpeechBubble={false}
              source={
                img.type === 'drawing'
                  ? { uri: img.img }         // dataUrl for drawings!
                  : img.img
                    ? img.img                // asset object for image packs
                    : getImageByPhrase(img.word)
              }
              x={img.x}
              y={img.y}
              rotation={img.rotation ?? 0}
              scale={img.scale ?? 1}
              drawingWidth={img.type === 'drawing' ? img.drawingWidth : undefined}
              drawingHeight={img.type === 'drawing' ? img.drawingHeight : undefined}
              drawingOffsetX={img.type === 'drawing' ? img.drawingOffsetX : undefined}
              drawingOffsetY={img.type === 'drawing' ? img.drawingOffsetY : undefined}
              isDrawing={img.type === 'drawing'}
              onMove={(newX, newY) => {
                updatePageState(prev => ({
                  ...prev,
                  placedImages: prev.placedImages.map(p =>
                    p.id === img.id ? { ...p, x: newX, y: newY } : p
                  )
                }));
              }}
              onRotate={newRotation => {
                updatePageState(prev => ({
                  ...prev,
                  placedImages: prev.placedImages.map(p =>
                    p.id === img.id ? { ...p, rotation: newRotation } : p
                  )
                }));
              }}
              onScale={newScale => {
                updatePageState(prev => ({
                  ...prev,
                  placedImages: prev.placedImages.map(p =>
                    p.id === img.id ? { ...p, scale: newScale } : p
                  )
                }));
              }}
              parentWidth={canvasSize.width}
              parentHeight={canvasSize.height}
              favoriteTopY={Math.max(0, metrics.favorite.absY - canvasY)}
              trashBarHeight={metrics.trash.height}
              onOverTrash={() => setTrashActive(true)}
              onLeaveTrash={() => setTrashActive(false)}
              onDelete={() => {
                updatePageState(prev => ({
                  ...prev,
                  placedImages: prev.placedImages.filter(p => p.id !== img.id)
                }));
                setTrashActive(false);
              }}
              onOverFavorite={() => setFavoriteActive(true)}
              onLeaveFavorite={() => setFavoriteActive(false)}
              onFavorite={() => {
                // Build the exact image object we display on canvas
                const favoriteImg =
                  img.type === 'drawing'
                    ? { uri: img.img }                               // data URL -> Image source
                    : (img.img ?? getImageByPhrase(img.word));       // asset or phrase lookup

                const safeLabel =
                  (typeof img.label === 'string' && img.label.trim()) ? img.label.trim() :
                  (typeof img.name  === 'string' && img.name.trim())  ? img.name.trim()  :
                  (typeof img.word  === 'string' && img.word.trim())  ? img.word.trim()  :
                  'Unnamed';

                addToFavorites({
                  img: favoriteImg,
                  label: safeLabel,
                  name:  safeLabel,
                  description: img.description || '',
                  isBackground: false,
                });
              }}
              favoriteBarHeight={metrics.favorite.height}
            />
          );
        })}
      </View>

    {/* Record button at the bottom */}
    <View style={styles.storyboardRecordButtonContainer}>
      
      <FlatList
        ref={wandPagerRef}
        data={[0, 1, 2]}
        keyExtractor={item => String(item)}
        horizontal
        pagingEnabled
        scrollEnabled={!isRecordingSession && !fabOpen}
        snapToInterval={PAGER_ITEM_WIDTH}
        snapToAlignment="center"
        decelerationRate="fast"
        disableIntervalMomentum={true}
        showsHorizontalScrollIndicator={false}
        style={{ width: PAGER_ITEM_WIDTH, height: PAGER_ITEM_WIDTH }}
        contentContainerStyle={{ alignItems: 'center' }}
        initialScrollIndex={wandPagerIndexRef.current || 0}
        getItemLayout={(_, index) => ({
          length: PAGER_ITEM_WIDTH,
          offset: PAGER_ITEM_WIDTH * index,
          index,
        })}
        initialNumToRender={3} // ensures all 3 are ready instantly
        renderItem={({ item }) => {
          if (item === 0) {

            // Wand Button
            return (
              <View style={{ width: tokens.button['3xl'], height: tokens.button['3xl'], alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
                <Animated.View style={pulsingStyle}>
                <TouchableOpacity
                  style={styles.storyboardRecordButton}
                  onPress={async () => {
                    clearNoImageFromHistory();

                    if (!isRecordingSession && !storyboardRecordingRef.current) {
                      // START
                      setCurrentButton("wand");
                      setIsRecordingSession(true);
                      await startStoryboardRecording();

                      recordTimeoutRef.current = setTimeout(() => {
                        autoStopRecording();
                      }, RECORD_TIMEOUT_MS);
                    } else if (isRecordingSession && storyboardRecordingRef.current) {
                      // STOP (use safe wrapper)
                      clearRecordingTimeout();
                      await stopRecordingNow();
                    }
                  }}
                  disabled={isTranscribing}
                >
                  <FontAwesome5 name={isRecordingSession ? 'stop' : 'magic'} size={tokens.button.md} color="#fff" />
                </TouchableOpacity>
                </Animated.View>
              </View>
            );
          }
          
          if (item === 1) {
            // Mic Button
            return (
              <View style={{ width: tokens.button['3xl'], height: tokens.button['3xl'], alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
                <Animated.View style={pulsingStyle}>
                <TouchableOpacity
                  style={{
                    width: tokens.button["2xl"],
                    height: tokens.button['2xl'],
                    borderRadius: tokens.radius.full,
                    backgroundColor: '#FFB86B',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={async () => {
                    clearNoImageFromHistory();

                    if (!isRecordingSession && !storyboardRecordingRef.current) {
                      // START
                      setCurrentButton("mic");
                      setIsRecordingSession(true);
                      await startStoryboardRecording();

                      recordTimeoutRef.current = setTimeout(() => {
                        autoStopRecording();
                      }, RECORD_TIMEOUT_MS);
                    } else if (isRecordingSession && storyboardRecordingRef.current) {
                      // STOP (use safe wrapper)
                      clearRecordingTimeout();
                      await stopRecordingNow();
                    }
                  }}

                  disabled={isTranscribing}
                >
                  <Ionicons name={isRecordingSession ? 'stop' :  "mic-outline"} size={tokens.button.md} color="#fff" />
                </TouchableOpacity>
                </Animated.View>
              </View>
            );
          }
          
          if (item === 2) {
            // Brush Button
            return (
              <View
                style={{
                  width: tokens.button['3xl'],
                  height: tokens.button['3xl'],
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'visible',
                }}
              >
              <TouchableOpacity
                ref={brushRef}
                style={{
                  width: tokens.button['2xl'],
                  height: tokens.button['2xl'],
                  borderRadius: tokens.radius.full,
                  backgroundColor: "#BA55D3",
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginHorizontal: tokens.spacing.xl,
                }}
                onPress={handleBrushPress}
              >
                <Ionicons name="brush" size={tokens.button.md} color="#fff" />
              </TouchableOpacity>
              </View>
            );
          }
          return null;
        }}
        onScroll={({ nativeEvent }) => {
          const x = nativeEvent?.contentOffset?.x ?? 0;

          // Compute index from offset
          const idx = Math.round(x / PAGER_ITEM_WIDTH);

          // Persist index across mounts (no re-render)
          if (wandPagerIndexRef && wandPagerIndexRef.current !== idx) {
            wandPagerIndexRef.current = idx;
          }

          // Keep dots/prompt in sync
          if (idx !== activeIndex) setActiveIndex(idx);
        }}
        scrollEventThrottle={16}
      />

      {/* PAGINATION DOTS */}
      <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
        <View style={{
          width: tokens.iconSize.xs,
          height: tokens.iconSize.xs,
          borderRadius: tokens.radius.full,
          backgroundColor: activeIndex === 0 ? '#555' : '#bbb',
          marginHorizontal: tokens.spacing.xs,
        }} />
        <View style={{
          width: tokens.iconSize.xs,
          height: tokens.iconSize.xs,
          borderRadius: tokens.radius.full,
          backgroundColor: activeIndex === 1 ? '#555' : '#bbb',
          marginHorizontal: tokens.spacing.xs,
        }} />
        <View style={{
          width: tokens.iconSize.xs,
          height: tokens.iconSize.xs,
          borderRadius: tokens.radius.full,
          backgroundColor: activeIndex === 2 ? '#555' : '#bbb',
          marginHorizontal: tokens.spacing.xs,
        }} />
      </View>
    </View>


    {/* Favorites Bar */}
    <View 
      style={{ 
        flexDirection: 'row',
        width: '100%',
        height: tokens.barHeight.md, 
        backgroundColor: '#f4f7fb',
        justifyContent: 'center',       
        alignItems: 'center',
        zIndex: 1,
        borderTopWidth: 1,
        borderTopColor: '#e5e5e5',
        bottom: tokens.barHeight.md,
      }}
        onLayout={e => {
          const h = e.nativeEvent.layout.height;
          const y = e.nativeEvent.layout.y + h;
          setFavoriteBarMetrics(h, y);
        }}
      >
        
    {/* Favorite Star Icon */}
    <Animated.View style={animatedStarStyle}>
      <FontAwesome5
        name="star"
        size={tokens.iconSize.lg}
        color={starGlow || favoriteActive ? "#ffd600" : "#b0b0b0"}
        solid={starGlow || favoriteActive}
        style={{ marginHorizontal: tokens.spacing["2xl"] }}
      />
    </Animated.View>

    {/* Main Background Dropdown (4/5 width) */}
    <View style={{ flex: 4, marginRight: tokens.spacing.sm, flexDirection: 'row', alignItems: 'center' }}>
     
     <SimpleDropdown
      value={mainOptions.find(o => o.bgIdx === bgIdx)?.label || ""}
      options={mainOptions}
      shouldCloseOnSelect={() => true} // your original behavior
      onChange={(opt) => {
        if (opt?.isCamera) {
          // Reuse existing photo immediately (no delay)
          if (pageState?.cameraBgUri) {
            const existingUri = pageState.cameraBgUri;
            updatePageState(prev => ({
              ...prev,
              bgIdx: -1,
              altIdx: 0,
              background: { uri: existingUri },
              cameraLocked: true,
            }));
            return;
          }

          // NEW CAPTURE: let the dropdown close first, then open camera
          if (typeof onUseCamera === 'function') {
            setTimeout(() => { onUseCamera(); }, 150); // 120–200ms is a good range
          }
          return;
        }

        // Normal backgrounds (unlock but keep URI)
        updatePageState(prev => ({
          ...prev,
          bgIdx: opt.bgIdx,
          altIdx: 0,
          background: opt.img,
          cameraLocked: false,
        }));
        if (typeof onUnlockCamera === 'function') onUnlockCamera();
      }}

      renderOptionRight={(opt) => {
        if (!opt?.isCamera) return null;

        const hasPhoto = !!pageState?.cameraBgUri;

        return (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {hasPhoto ? (
              <Image
                source={{ uri: pageState.cameraBgUri }}
                style={{
                  width: tokens.imageSize.sm,
                  height: tokens.imageSize.sm,
                  borderRadius: tokens.radius.sm,
                  marginHorizontal: tokens.spacing.xs,
                }}
              />
            ) : (
              <View
                style={{
                  width: tokens.imageSize.sm,
                  height: tokens.imageSize.sm,
                  borderRadius: tokens.radius.sm,
                  backgroundColor: '#eef2f7',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginHorizontal: tokens.spacing.xs,
                }}
              >
                <Ionicons name="camera-outline" size={tokens.iconSize.xl} color="#778399" />
              </View>
            )}

            {hasPhoto ? (
              <TouchableOpacity
                onPress={() => {
                  // 👇 Let the parent do the single source of truth update + storage clear
                  if (typeof onClearCamera === 'function') onClearCamera();
                }}
                hitSlop={12}
                style={{
                  width: tokens.iconSize.lg,
                  height: tokens.iconSize.lg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'transparent',
                }}
                accessibilityRole="button"
                accessibilityLabel="Clear camera background"
              >
                <Ionicons name="refresh-outline" size={tokens.iconSize.lg} color="#28394e" />
              </TouchableOpacity>
            ) : null}
          </View>
        );
      }}
    />

    </View>


    {/* Alternate Background Dropdown (1/5 width) */}
    <View style={{ width: "15%", minWidth: tokens.button.md }}>
      <AltBackgroundDropdown
        altOptions={altOptions}
        selectedAlternateIdx={altIdx}
        setSelectedAlternateIdx={(nextAltIdx) => {
          const alt = backgroundsFlat.find(o => o.bgIdx === bgIdx && o.altIdx === nextAltIdx);
          updatePageState({
            altIdx: nextAltIdx,
            background: alt?.img ?? selectedBg?.img,
          });
        }}
        updatePageState={updatePageState}
      />
    </View>


    {/* Plus Image Button RIGHT */}
          <TouchableOpacity
            onPress={() => {
              setLastStoryboardTab(bottomTab);
              setTab('library');
            }}
            style={{
              backgroundColor: 'transparent',
              borderColor: '#38b6ff',
              borderWidth: 2,
              borderRadius: tokens.radius.lg,
              width: tokens.iconSize.xl,
              height: tokens.iconSize.xl,
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: tokens.spacing["2xl"],
              marginRight: tokens.spacing["2xl"],
              shadowColor: '#38b6ff',
              shadowOpacity: 0.11,
              shadowRadius: 4,
              elevation: 2,
            }}
            hitSlop={12}
          >
            <Ionicons name="add" size={tokens.iconSize.md} color='#38b6ff' />
          </TouchableOpacity>
    </View>

     

          {/* THE Floating Animated Button Overlay */}
          <FloatingButtonMenu 
            icons={DEFAULT_ICONS} 
            actions={DEFAULT_ACTIONS} 
            open={fabOpen} 
            origin={fabOrigin} 
            tool={tool}
            setTool={setTool}
            isDrawing={isDrawing}
            setIsDrawing={setIsDrawing} />

  </View>
  );

}

// 1. SpeechBubble - text and audio only, all gestures through parent
function SpeechBubble({ text, textProps, audioUri, onPlaybackStart = () => {}, onPlaybackEnd = () => {} }) {
  const [isPlaying, setIsPlaying] = useState(false);

  const playAudio = async () => {
    if (!audioUri) return;
    try {
      setIsPlaying(true);
      if (typeof onPlaybackStart === "function") onPlaybackStart();
      const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
      await sound.setVolumeAsync(1.0);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          if (typeof onPlaybackEnd === "function") onPlaybackEnd();
          sound.unloadAsync();
        }
      });
    } catch (e) {
      setIsPlaying(false);
      if (typeof onPlaybackEnd === "function") onPlaybackEnd();
      console.log('Audio playback error:', e);
    }
  };

  return (
    <TouchableOpacity
      onPress={playAudio}
      activeOpacity={0.8}
      style={{ flex: 1, width: "100%", height: "100%", justifyContent: "center", alignItems: "center" }}
    >
      <Text {...textProps}>{text}</Text>
    </TouchableOpacity>
  );
}

// 2. Draggable History Bubble handles drag logic and calls parent on drop
function DraggableHistoryBubble({ line, image, source, onTap, audioUri }) {
  // Sizing
  const imageSize = tokens.imageSize.sm;

  if (image) {
    // IMAGE ONLY, no border, no background
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onTap(line, source)}
        style={{
          width: imageSize,
          height: imageSize,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
          marginVertical: tokens.spacing.xs,
          marginHorizontal: tokens.spacing.xs,
        }}
      >
        <Image
          source={image}
          style={{
            width: imageSize,
            height: imageSize,
            borderRadius: tokens.radius.sm,
          }}
          resizeMode="contain"
        />
      </TouchableOpacity>
    );
  }

  // Speech Bubble on History Bar
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onTap(line, source, audioUri)}
      style={{
        backgroundColor: '#fff',
        borderRadius: tokens.radius.lg,
        borderWidth: 2,
        borderColor: '#b0b0b0',
        paddingHorizontal: tokens.spacing.xs,
        paddingVertical: tokens.spacing.xs,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'flex-start',
        marginHorizontal: tokens.spacing.xs,
        marginVertical: tokens.spacing.lg,
        maxWidth:tokens.button.xl,
      }}
    >
      <Text style={{ color: '#b0b0b0' }}
        numberOfLines={1}
        ellipsizeMode="tail"
        >{line}</Text>
    </TouchableOpacity>
  );
}

// DrawingBrush lets the user draw and commit the drawing as an image
const DrawingBrush = forwardRef(function DrawingBrush(
  { visible, brushColor = "#BA55D3", brushWidth = 5, canvasWidth, canvasHeight, onComplete },
  ref
) {
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);
  const currentPathRef = useRef(null);
  const canvasRef = useCanvasRef();

  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  // PanResponder for drawing
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: e => {
        const { locationX, locationY } = e.nativeEvent;
        const pathObj = {
          path: `M${locationX},${locationY}`,
          color: brushColor,
          width: brushWidth,
        };
        setCurrentPath(pathObj);
      },
      onPanResponderMove: e => {
        const { locationX, locationY } = e.nativeEvent;
        setCurrentPath(prev =>
          prev ? { ...prev, path: prev.path + ` L${locationX},${locationY}` } : null
        );
      },
      onPanResponderRelease: () => {
        const latestPath = currentPathRef.current;
        if (latestPath && typeof latestPath === "object" && latestPath.path) {
          setPaths(prev => [...prev, latestPath]);
        }
        setCurrentPath(null);
      },
    })
  ).current;

  // Expose the commit function to the parent
  useImperativeHandle(ref, () => ({
    commit: async () => {
      console.log("[DrawingBrush] commit called");
      console.log("[DrawingBrush] paths:", paths);
console.log("[DrawingBrush] currentPathRef.current:", currentPathRef.current);
      let pathsToCommit = [...paths];
      if (
        currentPathRef.current &&
        typeof currentPathRef.current === "object" &&
        currentPathRef.current.path &&
        currentPathRef.current.path.length > 0
      ) {
        // Only add if currentPath is not already the last path in paths
        if (
          !paths.length ||
          paths[paths.length - 1].path !== currentPathRef.current.path
        ) {
          pathsToCommit.push(currentPathRef.current);
        }
      }

      if (!pathsToCommit || pathsToCommit.length === 0) {      
        console.log("[DrawingBrush] No paths to commit"); return;}


      // ---- 1. Collect all points ----
      let allPoints = [];
      for (const p of pathsToCommit) {
        if (p && p.path) {
          allPoints = allPoints.concat(extractPointsFromPath(p.path));
        }
      }

      if (allPoints.length === 0){console.log("[DrawingBrush] No points in paths"); return;}

      // ---- 2. Calculate bounding box ----
      let minX = Math.min(...allPoints.map(pt => pt.x));
      let maxX = Math.max(...allPoints.map(pt => pt.x));
      let minY = Math.min(...allPoints.map(pt => pt.y));
      let maxY = Math.max(...allPoints.map(pt => pt.y));
console.log("[DrawingBrush] allPoints:", allPoints);

      // Add padding (optional)
      const PADDING = tokens.spacing.xs;
      minX = Math.max(0, minX - PADDING);
      minY = Math.max(0, minY - PADDING);
      maxX = Math.min(canvasWidth, maxX + PADDING);
      maxY = Math.min(canvasHeight, maxY + PADDING);

      const cropWidth = Math.max(1, Math.round(maxX - minX));
      const cropHeight = Math.max(1, Math.round(maxY - minY));

      console.log("[DrawingBrush] Bounding box", { minX, minY, maxX, maxY });

      try {
        setPaths(pathsToCommit);
        setCurrentPath(null);

        await new Promise(resolve => setTimeout(resolve, 16));
        const image = await canvasRef.current.makeImageSnapshot();
          console.log("[DrawingBrush] makeImageSnapshot", image);
          console.log("[DrawingBrush] image type:", typeof image, image);
        console.log("Image size:", image.width(), image.height());

        // Crop the image
        console.log("[DrawingBrush] About to crop:", { x: minX, y: minY, width: cropWidth, height: cropHeight, canvasWidth, canvasHeight });
        let cropped = image;
        if (minX !== 0 || minY !== 0 || cropWidth !== canvasWidth || cropHeight !== canvasHeight) {
          cropped = image.makeSubset({ x: minX, y: minY, width: cropWidth, height: cropHeight });
          console.log("[DrawingBrush] Cropped image madeSubset:", cropped);
          console.log("[DrawingBrush] cropped type:", typeof cropped, cropped);
        }

        // Callback
        if (onComplete) {
              console.log("[DrawingBrush] Calling onComplete with image:", cropped);
          onComplete({
            image: cropped,
            drawingWidth: cropWidth,
            drawingHeight: cropHeight,
            drawingOffsetX: minX,
            drawingOffsetY: minY,
            canvasWidth,
            canvasHeight,
          });
        }

        setPaths([]);
      } catch (err) {
          console.log("[DrawingBrush] commit ERROR:", err);
        setPaths([]);
      }
    }
  }));

  if (!visible) return null;

  return (
   <Canvas
    ref={canvasRef}
    width={canvasWidth}
    height={canvasHeight}
    style={{ ...StyleSheet.absoluteFillObject, zIndex: 2 }}
    {...panResponder.panHandlers}
  >
    {paths.map((item, i) => {
      // Only try to make a path if item is valid
      if (
        item &&
        typeof item === "object" &&
        typeof item.path === "string" &&
        item.path.length > 0
      ) {
        const skiaPath = Skia.Path.MakeFromSVGString(item.path);
        if (!skiaPath) return null; // Don't render invalid paths
        return (
          <Path
            key={i}
            path={skiaPath}
            color={item.color}
            style="stroke"
            strokeWidth={item.width}
            strokeJoin="round"
            strokeCap="round"
          />
        );
      }
      return null;
    })}

    {currentPath &&
      typeof currentPath === "object" &&
      typeof currentPath.path === "string" &&
      currentPath.path.length > 0 && (() => {
        const skiaCurrent = Skia.Path.MakeFromSVGString(currentPath.path);
        if (!skiaCurrent) return null;
        return (
          <Path
            path={skiaCurrent}
            color={currentPath.color}
            style="stroke"
            strokeWidth={currentPath.width}
            strokeJoin="round"
            strokeCap="round"
          />
        );
      })()}
  </Canvas>
  );
});

// Utility: Parses an SVG path string ("M0,0 L10,10") and returns all {x, y} points
function extractPointsFromPath(pathStr) {
  // Matches "M10,20" or "L30,40"
  const regex = /[ML]\s*(-?\d*\.?\d+),\s*(-?\d*\.?\d+)/gi;
  const points = [];
  let match;
  while ((match = regex.exec(pathStr))) {
    points.push({ x: parseFloat(match[1]), y: parseFloat(match[2]) });
  }
  return points;
}


// Library screen with Audio/Images tabs
function LibraryScreen({ library, setLibrary, onSelectImage, setTab, setBottomTab, backgroundsFlat, lastStoryboardTab, updateStoryboardPage, canAddToPage, MAX_ITEMS_PER_PAGE }) {

    const { addImageLine, MAX_ITEMS_HISTORYBAR } = useHistory();

  //Background helper
    const keyOf = (src) => (src && src.uri) ? src.uri : String(src);

    //Image tiles
    const { favorites, setFavorites } = useFavorites();        // define first
    const [selectedImagePack, setSelectedImagePack] = useState('Favorites');

    const isFavorites = selectedImagePack === 'Favorites';
    const isBackgroundPack = selectedImagePack.toLowerCase().includes('background');

    const list = isFavorites
      ? (Array.isArray(favorites) ? favorites : [])
      : (imagePacks?.[selectedImagePack] ?? []);

    
    const plushOffsetRef = useRef(0);

    //Right side: Image popup modal
    const [selectedModalImage, setSelectedModalImage] = useState(null);
    const [showImageModal, setShowImageModal] = useState(false);

    const isFavorited = favorites.some(
      fav => fav.img === selectedModalImage?.img
    );

    const [carouselIdx, setCarouselIdx] = useState(0); // index within imagePacks[selectedImagePack]
    const images = selectedImagePack === "Favorites"
    ? favorites
    : (imagePacks[selectedImagePack] || []);

    const count = Math.min(5, images.length || 1); // don't allow 0
    const half = Math.floor(count / 2);
    const offsets = Array.from({ length: count }, (_, i) => i - half);

    useEffect(() => {
      const list = selectedImagePack === "Favorites" ? favorites : (imagePacks[selectedImagePack] || []);
      if (!list.length) return;

      const item = list[carouselIdx];
      if (!item) return;

      const isBackground = selectedImagePack === "Favorites"
        ? !!item.isBackground
        : selectedImagePack.toLowerCase().includes("background");

        // Build explicit normalized object with safe label
        setSelectedModalImage(
          {
            img: item.img ?? item,
            label:
              item.label ||
              item.name ||
              item.word ||
              item.id ||
              "Unnamed",
            name:
              item.name ||
              item.label ||
              item.word ||
              "Unnamed",
            description: item.description || "",
            isBackground,
          },
          isBackground
        );

      // eslint-disable-next-line
    }, [carouselIdx, selectedImagePack, favorites]);


  return (
    <View style={styles.libraryContainer}>

 <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: tokens.spacing.lg,
          width: '100%',
          height: tokens.barHeight.sm,
          backgroundColor: '#f4f7fb',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
          borderBottomWidth: 1,
          borderBottomColor: '#e5e5e5'
        }}
             >
        {/* Home Button */}
        <TouchableOpacity
          onPress={() => setTab('home')}
          style={{
            position: 'absolute',
            left: tokens.spacing["4xl"],
            paddingBottom: tokens.spacing.md,
            borderRadius: tokens.radius.md,
            backgroundColor: 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          hitSlop={12}
        >
          <Ionicons name="home" size={tokens.iconSize.lg} color="#28394e" />
        </TouchableOpacity>
 
        {/* Library Header Text */}
          <Text
            style={[ styles.libraryTabText ]}
          >
            Library
          </Text>

  {/* Back to Storyboard Button */}
        <TouchableOpacity
          onPress={() => setTab('storyboard')}
          style={{
            position: 'absolute',
            right: tokens.spacing["4xl"],
            paddingBottom: tokens.spacing.sm,
            borderRadius: tokens.radius.md,
            backgroundColor: 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          hitSlop={12}
        >
          <Ionicons name="close-circle-outline" size={tokens.iconSize.xl} color="#28394e" />
        </TouchableOpacity>

      </View>
        
  <View style={{ flex: 1, flexDirection: 'row', paddingVertical: tokens.spacing.sm }}>
  
  {/* Left: Image Pack List */}
  <View style={{ flex: 0.48, backgroundColor: '#f7faff', borderRadius: tokens.radius.md, paddingVertical: tokens.spacing.lg, paddingHorizontal: tokens.spacing.sm }}>
    
  {/* Favorites Folder */}
  <TouchableOpacity
    key="Favorites"
    style={{
      paddingVertical: tokens.spacing.lg,
      marginBottom: tokens.spacing.sm,
      borderRadius: tokens.radius.sm,
      backgroundColor: selectedImagePack === "Favorites" ? '#b6daff' : '#dde8fa',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: tokens.spacing.sm,
    }}
    onPress={() => setSelectedImagePack("Favorites")}
  >
    <Text style={{
      color: selectedImagePack === "Favorites" ? '#2187fa' : '#5c6c8a',
      fontSize: tokens.fontSize.body,
      fontWeight: 'bold',
    }}>
      Favorites
    </Text>
  </TouchableOpacity>

    {/* All Other Category Folders */}
    {Object.entries(imagePacks).map(([packName, images]) => (
      <TouchableOpacity
        key={packName}
        style={{
          paddingVertical: tokens.spacing.lg,
          marginBottom: tokens.spacing.sm,
          borderRadius: tokens.radius.sm,
          backgroundColor: selectedImagePack === packName ? '#b6daff' : '#dde8fa',
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: tokens.spacing.sm,
        }}
        onPress={() => setSelectedImagePack(packName)}
      >
        <Text style={{
          color: selectedImagePack === packName ? '#2187fa' : '#5c6c8a',
          fontSize: tokens.fontSize.body,
          fontWeight: 'bold',
        }}>
          {packName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </Text>
      </TouchableOpacity>
    ))}
  </View>

  {/* Right: Images in selected pack */}
  <View style={{
    flex: 0.55,
    backgroundColor: '#eef6fe',
    borderTopRightRadius: tokens.radius.md,
    borderBottomRightRadius: tokens.radius.md,
    paddingVertical: tokens.spacing.lg,
    padding: tokens.spacing.sm,
  }}>

  {/* --- "Add Pack to history bar" button --- */}
  {!isBackgroundPack && (
    <TouchableOpacity
      style={{
        marginBottom: tokens.spacing.lg,
        paddingVertical: tokens.spacing.md,
        paddingHorizontal: tokens.spacing["2xl"],
        borderRadius: tokens.radius.sm,
        backgroundColor: '#38b6ff',
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onPress={() => {
      // Favorites when active, else the selected pack
      const rawList =
        selectedImagePack === "Favorites"
          ? (favorites || [])
          : (imagePacks[selectedImagePack] || []);

      // Only plush (non-background)
      const plushOnly = rawList.filter(it => !it?.isBackground);

      // Add each plush to the GLOBAL history with its image
      plushOnly.forEach(it => {
        const imgSrc =
          it?.img ? it.img :
          (typeof it === 'number' ? it :
          it?.uri ? { uri: it.uri } :
          it?.url ? { uri: it.url } :
          null);

        if (!imgSrc) return;

        const label =
          (it?.label && String(it.label).trim()) ||
          (it?.name && String(it.name).trim()) ||
          (it?.word && String(it.word).trim()) ||
          (it?.id && String(it.id).trim()) ||
          "";

        if (label) addImageLine(label, imgSrc);
      });
      setTab("storyboard");
      setBottomTab?.(lastStoryboardTab);
    }}

    >
      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: tokens.fontSize.body, textAlign:'center' }}>
        Add Pack to History Bar
      </Text>
    </TouchableOpacity>
  )}

   {/* Image Tiles */}
      <ScrollView
        contentContainerStyle={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'flex-start',   // keep children at natural width
          alignContent: 'flex-start', // helps multi-row wrapping
          
        }}
      >
        {isFavorites && list.length === 0 ? (
          <Text style={{ color: '#aaa', fontSize: tokens.fontSize.body, padding: tokens.spacing.lg, textAlign: 'center' }}>
            No favorites yet.{"\n"}
            {"\n"}
            Tap the Star icon on an image to add it here! {"\n"}
            {"\n"}
            OR {"\n"}
            {"\n"}
            Drag an image on the canvas to the star!
          </Text>
        ) : (
          list.map((item, idx) => {
            // Robust image source fallback
            const imgSrc =
              item?.img ? item.img :
              (typeof item === 'number' ? item :
              item?.uri ? { uri: item.uri } :
              item?.url ? { uri: item.url } :
              null);

            if (!imgSrc) return null; // skip truly imageless entries

            const isBackground = isFavorites
              ? !!item?.isBackground
              : isBackgroundPack;

            const normalized = {
              ...(typeof item === 'object' ? item : {}),
              img: imgSrc,
              label: item?.label || item?.name || item?.word || item?.id || 'Unnamed',
              name:  item?.name  || item?.label || item?.word || 'Unnamed',
              description: item?.description || '',
              isBackground,
            };

            return (
              <TouchableOpacity
                key={String(item?.id ?? item?.label ?? item?.name ?? item?.word ?? idx)}
                onPress={() => {
                  setSelectedModalImage(normalized, normalized.isBackground);
                  setCarouselIdx(idx);
                  setShowImageModal(true);
                }}
                style={{
                  margin: tokens.spacing.xs,
                  alignItems: 'center',
                }}
              >
                <Image
                  source={imgSrc}
                  style={{
                    width: tokens.imageSize.md,
                    height: tokens.imageSize.md,
                    borderRadius: tokens.radius.md,
                    marginBottom: tokens.spacing.xs,
                    backgroundColor: '#fff',
                  }}
                  resizeMode="contain"
                  resizeMethod="resize" // Android: downsample decode
                />
                <Text
                  numberOfLines={2}
                  style={{ fontSize: tokens.fontSize.caption, color: '#444', textAlign: 'center', maxWidth:tokens.imageSize.md }}
                >
                  {normalized.name}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

  </View>
    
  {/* Plush Detail Modal */}
  <Modal isVisible={showImageModal} onBackdropPress={() => setShowImageModal(false)}>
    {selectedModalImage && (
      <View
        style={{
          backgroundColor: '#fff',
          borderRadius: tokens.radius.lg,
          padding: tokens.spacing["3xl"],
          alignItems: 'center',
          width: tokens.canvasModal.md,
          maxWidth: '90%',
          height: tokens.canvasModal.lg,
          alignSelf: 'center',
          overflow: 'visible',
        }}
      >
        {/* Pop-out image */}
        <View
          style={{
            alignItems: 'center',
            marginTop: - (tokens.spacing['2xl'] * 5),    // pop the image out of the card!
            zIndex: 10,
            position: 'relative', // <-- add this!
            width: tokens.imageSize.xl,            // matches image size for overlay
            height: tokens.imageSize.xl,
          }}
        >
          <Image
            source={selectedModalImage.img}
            style={{
              width: tokens.imageSize.xl,
              height: tokens.imageSize.xl,
              borderRadius: tokens.radius.md,
            }}
            resizeMode="contain"
          />
        
        {/* Favorite Star Icon in Circle */}
        <TouchableOpacity
          onPress={() => {
            if (isFavorited) {
              setFavorites(favs =>
                favs.filter(fav => fav.img !== selectedModalImage.img)
              );
            } else {
              // Always store correct isBackground!
              setFavorites(favs =>
                favs.some(fav => fav.img === selectedModalImage.img)
                  ? favs
                  : [
                      ...favs,
                      {
                        ...selectedModalImage,
                        // This will "force" true if in a background pack, else keep existing
                        isBackground:
                          selectedImagePack.toLowerCase().includes('background')
                            ? true
                            : selectedModalImage.isBackground || false,
                      },
                    ]
              );
            }
          }}
          style={{
            position: 'absolute',
            bottom: tokens.spacing.sm,
            right: tokens.spacing.sm,
            backgroundColor: '#fff',
            borderRadius: tokens.radius.full,
            width: tokens.button.md,
            height: tokens.button.md,
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
          }}
          activeOpacity={0.7}
          hitSlop={12}
        >
          <FontAwesome5
            name="star"
            size={tokens.iconSize.lg}
            color={isFavorited ? '#ffd600' : '#b0b0b0'}
            solid={isFavorited}
          />
        </TouchableOpacity>

        {/* Image Name */}
        <Text style={{ fontSize: tokens.fontSize.title, fontWeight: 'bold', marginTop: tokens.spacing.md, marginBottom: tokens.spacing.xl }}>
          {selectedModalImage.name || selectedModalImage.label || selectedModalImage.word || "Unnamed"}
        </Text>

        {/* Image Description */}
        <View
          style={{
            height: tokens.spacing['2xl'] * 5, // Set the height you want (e.g., enough for 2 lines of 18-22px font)
            width: tokens.canvasModal.md,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: tokens.spacing.xl,
          }}
        >
          <Text
            style={{
              fontSize: tokens.fontSize.body,
              color: '#444',
              textAlign: 'center',
              width: '80%',
            }}

            ellipsizeMode="tail"
          >
            {selectedModalImage.description}
          </Text>
        </View>


        {/* --- Carousel with Arrows --- */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.spacing["2xl"] }}>
       
          {/* Back Arrow */}
          <TouchableOpacity
            onPress={() => setCarouselIdx((prev) =>
              (prev - 1 + images.length) % images.length
            )}
            style={{
              padding: tokens.spacing.sm,
              marginLeft: tokens.spacing.xl,
              borderRadius: tokens.radius.lg,
              backgroundColor: '#eaf6ff',
              opacity: images.length > 1 ? 1 : 0.3,
              zIndex:2,
            }}
            disabled={images.length <= 1}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={tokens.iconSize.xl} color="#38b6ff" />
          </TouchableOpacity>

          {/* Carousel Thumbnails */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            {offsets.map(offset => {
              const idx = (carouselIdx + offset + images.length) % images.length;
              const item = images[idx];
              if (!item) return null;

              // Style logic for thumbnail size and emphasis
              let size = tokens.imageSize.sm;
              let borderWidth = 0;
              let opacity = 0.5;
              if (offset === 0) { size = tokens.imageSize.sm + 14; borderWidth = 2; opacity = 1; }
              else if (Math.abs(offset) === 1) { size = tokens.imageSize.sm - 4; opacity = 0.75; }
              else if (Math.abs(offset) === 2) { size = tokens.imageSize.sm - 4; opacity = 0.5; }

              return (
                <TouchableOpacity
                  key={`${idx}-${offset}`}
                  onPress={() => {
                    const isBackground =
                      selectedImagePack === "Favorites"
                        ? !!item.isBackground
                        : selectedImagePack.toLowerCase().includes("background");

                    setCarouselIdx(idx);

                    // Build explicit object (no spreading ambiguous values)
                    setSelectedModalImage(
                        {
                          img: item.img ?? item,
                          label: item.label || item.name || item.word || item.id || "Unnamed",
                          name:  item.name  || item.label || item.word || "Unnamed",
                          description: item.description || "",
                          isBackground,
                        },
                        isBackground
                    );
                  }}
                  style={{
                    opacity,
                    borderWidth,
                    borderColor: offset === 0 ? '#38b6ff' : 'transparent',
                    borderRadius: tokens.radius.full,
                    backgroundColor: '#fff',
                    width: size + 6,
                    height: size + 6,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Image source={item.img ?? item}
                    style={{
                      width: size,
                      height: size,
                      borderRadius: tokens.radius.sm,
                    }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Forward Arrow */}
          <TouchableOpacity
            onPress={() => setCarouselIdx((prev) =>
              (prev + 1) % images.length
            )}
            style={{
              padding: tokens.spacing.sm,
              marginRight: tokens.spacing.xl,
              borderRadius: tokens.radius.lg,
              backgroundColor: '#eaf6ff',
              opacity: images.length > 1 ? 1 : 0.3,
              zIndex:2,
            }}
            disabled={images.length <= 1}
            hitSlop={12}
          >
            <Ionicons name="chevron-forward" size={tokens.iconSize.xl} color="#38b6ff" />
          </TouchableOpacity>
        </View>

       {/* Add Plush / Set Background */}
<TouchableOpacity
  style={{
    width: "90%",
    paddingVertical: tokens.spacing.lg,
    paddingHorizontal: tokens.spacing.lg,
    borderRadius: tokens.radius.sm,
    backgroundColor: '#38b6ff',
    marginBottom: selectedModalImage.isBackground ? 0 : 12,
  }}
    onPress={() => {
      if (selectedModalImage.isBackground) {
        // ✅ Set background on the page, but DO NOT add to history
        const match = backgroundsFlat.find(o => keyOf(o.img) === keyOf(selectedModalImage.img));

        if (typeof onSelectImage === 'function') {
          onSelectImage(
            selectedModalImage.img,
            selectedModalImage.label,
            selectedModalImage.name,
            selectedModalImage.description,
            true,   // isBackground
            undefined,
            undefined
          );
        }

        if (match) {
          updateStoryboardPage(lastStoryboardTab, {
            bgIdx: match.bgIdx,
            altIdx: match.altIdx,
            background: match.img,
            cameraLocked: false,
          });
        } else {
          updateStoryboardPage(lastStoryboardTab, { background: selectedModalImage.img, cameraLocked: false });
        }

        setShowImageModal(false);
        setTab('storyboard');
      } else {
        // 🔒 Per-page cap guard (images + speech)
        if (typeof canAddToPage === 'function' && !canAddToPage(lastStoryboardTab)) {
          Alert.alert(
            "Limit reached",
            `You can place up to ${MAX_ITEMS_PER_PAGE} items (images + speech) on this page.`
          );
          return;
        }

        // Plush placement (random offsets)
        const baseX = 100, baseY = 100;
        const offsetX = plushOffsetRef.current * 50 + Math.floor(Math.random() * 60);
        const offsetY = plushOffsetRef.current * 50 + Math.floor(Math.random() * 60);
        plushOffsetRef.current = (plushOffsetRef.current + 1) % 10;

        if (typeof onSelectImage === 'function') {
          onSelectImage(
            selectedModalImage.img,
            selectedModalImage.label,
            selectedModalImage.name,
            selectedModalImage.description,
            false, // isBackground
            baseX + offsetX,
            baseY + offsetY
          );
        }

        // Add to GLOBAL history WITH image thumbnail
        const label =
          selectedModalImage.label ||
          selectedModalImage.name  ||
          "Unnamed";

        if (label && selectedModalImage.img) {
          addImageLine(label, selectedModalImage.img);
        }

        setShowImageModal(false);
        setTab('storyboard');
      }
    }}

  >
    <Text style={{ color: '#fff', fontSize: tokens.fontSize.body, fontWeight: 'bold', textAlign: 'center' }}>
      {selectedModalImage.isBackground ? 'Set as Background' : 'Add Plush'}
    </Text>
  </TouchableOpacity>

        {/* Shop This Plush (non-backgrounds) */}
        {!selectedModalImage.isBackground && (
          <TouchableOpacity
            style={{
              width: "90%",
              paddingVertical: tokens.spacing.lg,
              paddingHorizontal: tokens.spacing.lg,
              borderRadius: tokens.radius.sm,
              backgroundColor: '#eaf6ff',
            }}
            onPress={() => {
              setShowImageModal(false);
              setTab("shoppinglinks");    // jump to the ShoppingLinks tab
            }}
          >
            <Text style={{ color: '#38b6ff', fontSize: tokens.fontSize.body, fontWeight: 'bold', textAlign: 'center' }}>
              Shop This Plush
            </Text>
          </TouchableOpacity>
        )}
      </View>
      </View>
    )} 
  </Modal>
</View>

    </View>
  ); 
  }

//Shop Component
  function ShoppingLinks( {setTab} ) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ImageBackground
          //source={assets.ShopBg}
          style={styles.shopbackground}
          resizeMode="cover"
        >

        {/* Home Button */}
        <TouchableOpacity
          onPress={() => setTab('home')}
          style={{
            position: 'absolute',
            left: tokens.spacing["4xl"],
            borderRadius: tokens.radius.lg,
            backgroundColor: 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
          hitSlop={12}
        >
          <Ionicons name="home" size={tokens.iconSize.lg} color="#28394e" />
        </TouchableOpacity>
          <View style={styles.shopScreenContainer}>

           {/* HEADER TEXT */}
          <Text style={styles.shopHeaderText}>SHOPS</Text>

            {/* BUDDIE SYSTEM */}
            <TouchableOpacity
              style={[ styles.shopBuddieSystemButton]}
              onPress={() => openAffiliate(SHOP_URLS.buddie)}
              activeOpacity={0.85}
              hitSlop={12}
            >
              <Image source={assets.BuddieSystem} style={styles.shopButtonImage} />
              <Text style={styles.shopButtonOverlayText}>BUDDIE SYSTEM</Text>
            </TouchableOpacity>

            {/* AURORA */}
            <TouchableOpacity
              style={[ styles.shop2Button]}
              onPress={() => openAffiliate(SHOP_URLS.aurora)}
              activeOpacity={0.85}
              hitSlop={12}
            >
              <Image source={assets.Aurora} style={styles.shopButtonImage} />
              <Text style={styles.shopButtonOverlayText}>AURORA</Text>
            </TouchableOpacity>
           
          </View>
        </ImageBackground>
      </SafeAreaView>
    );
  }

  // --- HomeScreen Component ---
function HomeScreen({ setTab }) {
  // Nonstop pulsing scale for the Play overlay
  const playPulseScale = useSharedValue(1);

  const playPulsingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playPulseScale.value }],
  }));

  React.useEffect(() => {
    // Standard smooth pulse: grow → shrink → repeat
    playPulseScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 600 }),
        withTiming(1.0, { duration: 600 })
      ),
      -1, // infinite
      true
    );

    return () => {
      cancelAnimation(playPulseScale);
      playPulseScale.value = 1;
    };
  }, [playPulseScale]);

  // Library image scrolling
  const [libWidth, setLibWidth] = React.useState(0);
  const libScrollX = useSharedValue(0);

  const libAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: libScrollX.value }],
  }));

  React.useEffect(() => {
    if (libWidth > 0) {
      // reset then start endless linear scroll: 0 → -libWidth → jump back → repeat
      libScrollX.value = 0;
      libScrollX.value = withRepeat(
        withTiming(-libWidth, { duration: 8000, easing: Easing.linear }),
        -1,
        false
      );
      return () => cancelAnimation(libScrollX);
    }
  }, [libWidth]);


  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ImageBackground
        //source={assets.homeBg}
        style={styles.homebackground}
        resizeMode="cover"
      >
        <View style={styles.homeScreenContainer}>
          {/* STORYBOARD */}
          <TouchableOpacity
            style={[styles.homeScreenStoryboardButton]}
            onPress={() => setTab("storyboard")}
            activeOpacity={0.85}
          >
            <Image source={assets.storyboard} style={styles.buttonImage} />
            <Text style={styles.buttonOverlayText}>STORYBOARD</Text>

            {/* Non-interactive pulsing Play overlay (centered) */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Animated.View
                style={[
                  {
                    width: tokens.button['2xl'],
                    height: tokens.button['2xl'],
                    borderRadius: tokens.radius.full,
                    backgroundColor: '#62baf5ff',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOpacity: 0.2,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 3 },
                    elevation: 4,
                  },
                  playPulsingStyle,
                ]}
              >
                <FontAwesome5 name="play" size={tokens.button.md} color="#fff"
                style={{ marginLeft: tokens.spacing.sm }} 
                 />
              </Animated.View>
            </View>
          </TouchableOpacity>

          {/* LIBRARY */}
          <TouchableOpacity
            style={styles.homeScreenButton}
            onPress={() => setTab("library")}
            activeOpacity={0.85}
          >
            {/* Scrolling image track */}
            <View
              onLayout={(e) => setLibWidth(e.nativeEvent.layout.width)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                overflow: 'hidden',
              }}
            >
              <Animated.View
                style={[
                  {
                    flexDirection: 'row',
                    width: libWidth * 2 || '200%', // ensure width while measuring
                    height: '100%',
                  },
                  libAnimStyle,
                ]}
              >
                {/* Two copies for seamless loop */}
                <Image
                  source={assets.library}
                  style={{ width: libWidth || '50%', height: '100%', resizeMode: 'cover' }}
                />
                <Image
                  source={assets.library}
                  style={{ width: libWidth || '50%', height: '100%', resizeMode: 'cover' }}
                />
              </Animated.View>
            </View>

            {/* Keep your overlay label */}
            <Text style={styles.buttonOverlayText}>LIBRARY</Text>
          </TouchableOpacity>


          {/* SHOP */}
          <TouchableOpacity
            style={styles.shopButton}
            activeOpacity={0.85}
            onPress={() => setTab("shoppinglinks")}
          >
            <Image source={assets.shop} style={styles.buttonImage} />
            <Text style={styles.buttonOverlayText}>SHOP</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

function ScreenNavigation(props) {
  const {
    tokens,
    tab, setTab,
    bottomTab, setBottomTab,
    lastStoryboardTab, setLastStoryboardTab,
    pageKeys, setPageKeys,
    showPagesMenu, setShowPagesMenu,
    pageTabScrollRef, tabScrollXRef,
    renamingPageKey, setRenamingPageKey,
    renameValue, setRenameValue,
    storyboardPages, setStoryboardPages,
    DEFAULT_PAGE_STATE,
    addNewPage,
    handleSharePage,
    handleRefreshPage,
    handleDeletePage,
    handleSavePageName,
    updateStoryboardPage,
    library, setLibrary,
    onUseCamera, onUnlockCamera, onClearCamera,
    canAddToPage, MAX_ITEMS_PER_PAGE,
    wandPagerIndexRef,
  } = props;

  const { addImageLine } = useHistory();

  const [derivedPrompt, setDerivedPrompt] = useState('Press the wand and say "elephant"!');
  
  // --- Your existing mainScreen branching, with tiny tweaks ---
    let mainScreen = null;

    if (tab === "home") {
      mainScreen = <HomeScreen setTab={setTab} />;

    } else if (tab === "storyboard") {
      const currentPageKey = bottomTab;

      mainScreen = (
        <View style={{ flex: 1 }}>
          <StoryboardScreen
            setTab={setTab}
            setLastStoryboardTab={setLastStoryboardTab}
            bottomTab={bottomTab}
            pageKey={currentPageKey}
            pageState={storyboardPages[currentPageKey]}
            updatePageState={newState => updateStoryboardPage(currentPageKey, newState)}
            onAddPage={addNewPage}
            onUseCamera={() => onUseCamera(bottomTab)}
            onClearCamera={() => onClearCamera(bottomTab)}
            onUnlockCamera={() => onUnlockCamera(bottomTab)}
            canAddToPage={canAddToPage}
            wandPagerIndexRef={wandPagerIndexRef}
            onPromptChange={setDerivedPrompt}
          />

          {/* Global History Bar */}
          <HistoryBar 
          tokens={tokens}
          defaultPrompt={derivedPrompt}
           />

          {/* Storyboard page tabs */}
          <View style={{
            flexDirection: 'row',
            borderTopWidth: 2,
            borderColor: '#eee',
            backgroundColor: '#f4f7fb',
            paddingHorizontal: tokens.spacing.sm,
            height: tokens.barHeight.sm,
            alignItems: 'center',
          }}>
            <ScrollView
              ref={pageTabScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ flexDirection: 'row', alignItems: 'center' }}
              style={{ flex: 1 }}
              onScroll={({ nativeEvent }) => {
                tabScrollXRef.current = nativeEvent?.contentOffset?.x ?? 0;
              }}
              scrollEventThrottle={16}
            >
              {pageKeys.map(key => (
                <TouchableOpacity
                  key={key}
                  style={{ minWidth: tokens.button.xl, alignItems: 'center', paddingHorizontal: tokens.spacing.md, justifyContent: 'center' }}
                  hitSlop={12}
                  onPress={() => setBottomTab(key)}
                >
                  <Text style={{ color: bottomTab === key ? '#000' : '#888', fontWeight: 'bold', fontSize: tokens.fontSize.body }}>
                    {storyboardPages[key].name?.trim()
                      ? storyboardPages[key].name
                      : `Page ${key.replace('storyboard', '')}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setShowPagesMenu(true)}
              style={{ width: tokens.button.xl, alignItems: 'center', justifyContent: 'center' }}
              hitSlop={12}
            >
              <Ionicons name="menu-outline" size={tokens.iconSize.xl} color="#28394e" />
            </TouchableOpacity>
          </View>
        </View>
      );

    } else if (tab === "library") {
      mainScreen = (
        <LibraryScreen
          setTab={setTab}
          library={library}
          setLibrary={setLibrary}
          setBottomTab={setBottomTab}
          backgroundsFlat={imagePacks.backgrounds}
          lastStoryboardTab={lastStoryboardTab}
          updateStoryboardPage={updateStoryboardPage}
          canAddToPage={canAddToPage}
          MAX_ITEMS_PER_PAGE={MAX_ITEMS_PER_PAGE}
          onSelectImage={(img, label, name, description, isBackground, x, y) => {
            updateStoryboardPage(lastStoryboardTab, prevPageState => {
              if (isBackground) {
                return { ...prevPageState, background: img };
              } else {
                return {
                  ...prevPageState,
                  placedImages: [
                    ...(prevPageState.placedImages || []),
                    {
                      id: Date.now(),
                      img,
                      word: label,
                      name: name || "Unknown",
                      description: description || "",
                      x: x !== undefined ? x : 100,
                      y: y !== undefined ? y : 100,
                      rotation: 0,
                      scale: 1
                    },
                  ],
                };
              }
            });
            setTab("storyboard");
            setBottomTab(lastStoryboardTab);
          }}
        />
      );

    } else if (tab === "shoppinglinks") {
      mainScreen = <ShoppingLinks setTab={setTab} />;
    }

    // Storyboard Page Settings Modal
    return (
        <View style={{ flex: 1, position: "relative" }}>
          {/* Page Management Modal — unchanged */}
          <Modal
            visible={showPagesMenu}
            transparent
            animationType="fade"
            onRequestClose={() => setShowPagesMenu(false)}
          >
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <TouchableOpacity
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                activeOpacity={1}
                onPress={() => setShowPagesMenu(false)}
              />
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}
              >
                <View
                  style={{
                    backgroundColor: 'white',
                    borderRadius: tokens.radius.lg,
                    padding: tokens.spacing.xl,
                    minWidth: tokens.canvasModal.md,
                    width: '95%',
                    alignSelf: 'center',
                    elevation: 8,
                  }}
                >
                  <Text style={{ fontSize: tokens.fontSize.title, fontWeight: 'bold', marginBottom: tokens.spacing.md, textAlign: 'center', width: '100%' }}>
                    Storyboard Pages
                  </Text>
                  <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: tokens.canvasModal.md }}>
                    {pageKeys.map((key, i) => (
                      <View key={key} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.spacing.md }}>
                        <TouchableOpacity
                          style={{ marginRight: tokens.spacing.sm, padding: tokens.spacing.xs }}
                          onPress={() => {
                            setRenamingPageKey(key);
                            setRenameValue(storyboardPages[key].name || '');
                          }}
                        >
                          <FontAwesome5 name="pencil-alt" size={tokens.iconSize.sm} color="#38b6ff" />
                        </TouchableOpacity>

                        {renamingPageKey === key ? (
                          <TextInput
                            autoFocus
                            value={renameValue}
                            onChangeText={setRenameValue}
                            onBlur={() => handleSavePageName(key)}
                            onSubmitEditing={() => handleSavePageName(key)}
                            style={{
                              flex: 1,
                              borderBottomWidth: 1,
                              borderColor: '#38b6ff',
                              fontSize: tokens.fontSize.body,
                              paddingVertical: tokens.spacing.xs,
                              marginRight: tokens.spacing.xs,
                              color: '#28394e',
                            }}
                            placeholder={`Page ${key.replace('storyboard', '')}`}
                            maxLength={20}
                            returnKeyType="done"
                          />
                        ) : (
                          <Text style={{ flex: 1, fontSize: tokens.fontSize.body, marginRight: tokens.spacing.xs }}>
                            {storyboardPages[key].name?.trim()
                              ? storyboardPages[key].name
                              : `Page ${key.replace('storyboard', '')}`}
                          </Text>
                        )}

                        <TouchableOpacity
                          style={{ marginHorizontal: tokens.spacing.md, padding: tokens.spacing.xs }}
                          onPress={() => handleSharePage(key)}
                        >
                          <Ionicons name="share-outline" size={tokens.iconSize.md} color="#38b6ff" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={{ marginHorizontal: tokens.spacing.xs, padding: tokens.spacing.xs }}
                          onPress={() => handleRefreshPage(key)}
                        >
                          <Ionicons name="refresh-outline" size={tokens.iconSize.md} color="#38b6ff" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={{ marginHorizontal: tokens.spacing.xs, padding: tokens.spacing.xs }}
                          onPress={() => handleDeletePage(key)}
                        >
                          <Ionicons name="trash-outline" size={tokens.iconSize.md} color="#C00" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </KeyboardAvoidingView>
            </View>
          </Modal>
          {mainScreen}
        </View>
    );
}

export default function App() {
  // PAGE & LIBRARY STATE
  
  const [pageState, setPageState] = useState({ /* your initial shape */ });

  const updatePageState = useCallback((patch) => {
    setPageState(prev => ({ ...prev, ...patch }));
  }, []);

  const [library, setLibrary] = useState([]);

  // Home/Storyboard/Library navigation
  const [tab, setTab] = useState("home");

  //Persisted Page Tab Scroll
  const tabScrollXRef = useRef(0);

  // Persisted Wand/Mic/Brush Scroll
  const wandPagerIndexRef = useRef(0);

  // Storyboard page logic
  const [bottomTab, setBottomTab] = useState('storyboard1');
  const [lastStoryboardTab, setLastStoryboardTab] = useState('storyboard1');

  const [pageKeys, setPageKeys] = useState(['storyboard1', 'storyboard2']);
  const [showPagesMenu, setShowPagesMenu] = useState(false);
  const pageTabScrollRef = useRef(null);

  const [renamingPageKey, setRenamingPageKey] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const DEFAULT_PAGE_STATE = {
    background: null,
    images: [],
    text: "",
    transcriptLines: [],
    placedImages: [],
    name: '',
    cameraBgUri: null,
    cameraLocked: false, 
  };

  const [storyboardPages, setStoryboardPages] = useState({
    storyboard1: { ...DEFAULT_PAGE_STATE },
    storyboard2: { ...DEFAULT_PAGE_STATE },
  });

  const getEligibleCountForPage = (pageKey) => {
  const items = storyboardPages?.[pageKey]?.placedImages || [];
  // Only count images & speech
  return items.reduce((acc, it) => acc + ((it?.type === 'image' || it?.type === 'speech') ? 1 : 0), 0);
  };

  const canAddToPage = (pageKey) => {
    return getEligibleCountForPage(pageKey) < MAX_ITEMS_PER_PAGE;
  };

  // Optional: expose remaining count if you want to gray out buttons at 0
  const remainingSlotsForPage = (pageKey) => {
    return Math.max(0, MAX_ITEMS_PER_PAGE - getEligibleCountForPage(pageKey));
  };

  function getNextPageNumber(pageKeys) {
    const usedNumbers = pageKeys.map(k => parseInt(k.replace('storyboard', ''), 10));
    let num = 1;
    while (usedNumbers.includes(num)) num += 1;
    return num;
  }

  const addNewPage = () => {
    if (pageKeys.length >= MAX_PAGES) {
      Alert.alert(
        'Page limit reached',
        `You can have up to ${MAX_PAGES} pages. Delete a page to add a new one.`
      );
      return;
    }

    const nextNum = getNextPageNumber(pageKeys);
    const newPageKey = `storyboard${nextNum}`;

    setPageKeys(prev => [...prev, newPageKey]);

    setStoryboardPages(prev => ({
      ...prev,
      [newPageKey]: { ...DEFAULT_PAGE_STATE },
    }));

    setBottomTab(newPageKey);

    setTimeout(() => {
      if (pageTabScrollRef.current) {
        pageTabScrollRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };


  const updateStoryboardPage = (pageKey, updater) => {
    setStoryboardPages(prev => ({
      ...prev,
      [pageKey]: typeof updater === 'function'
        ? { ...prev[pageKey], ...updater(prev[pageKey]) }
        : { ...prev[pageKey], ...updater }
    }));
  };

  function handleSharePage(key) {
    alert(`Share Page ${key.replace('storyboard', '')}`);
  }

  function handleRefreshPage(key) {
    setStoryboardPages(prev => ({
      ...prev,
      [key]: { ...DEFAULT_PAGE_STATE }
    }));
    setBottomTab(key);
    setShowPagesMenu(false);
  }

  function handleDeletePage(key) {
    if (pageKeys.length <= 1) {
      alert("You must have at least one page.");
      return;
    }
    setPageKeys(prev => prev.filter(k => k !== key));
    setStoryboardPages(prev => {
      const newPages = { ...prev };
      delete newPages[key];
      return newPages;
    });
    if (bottomTab === key) {
      const nextKey = pageKeys.find(k => k !== key) || pageKeys[0];
      setBottomTab(nextKey);
    }
  }

  function handleSavePageName(key) {
    setStoryboardPages(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        name: renameValue.trim() ? renameValue.trim() : prev[key].name,
      },
    }));
    setRenamingPageKey(null);
    setRenameValue('');
  }

  // Restore page-tabs scroll position when returning to the Storyboard tab
  useEffect(() => {
  if (tab === 'storyboard' && pageTabScrollRef.current) {
    const id = setTimeout(() => {
      try {
        pageTabScrollRef.current.scrollTo({ x: tabScrollXRef.current, animated: false });
      } catch {}
    }, 0);
    return () => clearTimeout(id);
  }
}, [tab]); // depend only on tab

    // Camera Background Photo
  const STORAGE_URI_KEY = 'cameraBgUri';
  const STORAGE_LOCK_KEY = 'cameraBgLocked';

  // REHYDRATE CAMERA STATE ON APP LOAD
  useEffect(() => {
  (async () => {
    try {
      const [uri, locked] = await Promise.all([
        AsyncStorage.getItem(STORAGE_URI_KEY),
        AsyncStorage.getItem(STORAGE_LOCK_KEY),
      ]);

      if (uri && locked === '1') {
        updateStoryboardPage(bottomTab, prev => ({
          ...prev,
          cameraBgUri: uri,
          cameraLocked: true,
          bgIdx: -1,
          altIdx: 0,
          background: { uri },
        }));
      } else if (uri) {
        updateStoryboardPage(bottomTab, prev => ({
          ...prev,
          cameraBgUri: uri,
          cameraLocked: false,
        }));
      }
    } catch {}
  })();
}, []);

  // CAMERA HELPERS
  // Persist/remove the URI + lock flag
  const persistCamera = async (uri, locked) => {
    if (uri) await AsyncStorage.setItem(STORAGE_URI_KEY, uri);
    else await AsyncStorage.removeItem(STORAGE_URI_KEY);
    await AsyncStorage.setItem(STORAGE_LOCK_KEY, locked ? '1' : '0');
  };

  // Launch camera, persist on capture, update page state
  const handleUseCamera = async (pageKey) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to set a camera background.');
      return;
    }

    // We’re NOT using InteractionManager or custom utilities per your request.
    // Camera will be called from the dropdown with a tiny setTimeout (Step 3).

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.9,
      allowsEditing: false,
      exif: false,
      base64: false,
    });

    if (!result.canceled && result.assets?.length) {
      const uri = result.assets[0].uri;

      await persistCamera(uri, true); // save URI + lock='1'

      updateStoryboardPage(pageKey, prev => ({
        ...prev,
        cameraBgUri: uri,
        cameraLocked: true,
        bgIdx: -1,
        altIdx: 0,
        background: { uri },
      }));
    }
  };

  // Unlock when switching to a normal background (keep the URI for reuse)
  const handleUnlockCamera = async (pageKey) => {
    await AsyncStorage.setItem(STORAGE_LOCK_KEY, '0');
    updateStoryboardPage(pageKey, prev => ({
      ...prev,
      cameraLocked: false,
    }));
  };

  /// Explicit delete = remove from storage; only jump to Blank if the current bg is Camera
const handleClearCamera = async (pageKey) => {
  // remove URI + unlock
  await persistCamera(null, false);

  setStoryboardPages(prev => {
    const wasCamera = prev?.[pageKey]?.bgIdx === -1;

    const nextPage = {
      ...prev[pageKey],
      cameraBgUri: null,
      cameraLocked: false,
      // only reset bg to Blank if we were on Camera; otherwise leave current bg alone
      ...(wasCamera
        ? { bgIdx: 0, altIdx: 0, background: null }
        : {})
    };

    return { ...prev, [pageKey]: nextPage };
  });
};

    return (
    <FavoritesProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#f3f6fa" }}>
          {/* ⬇️ Make history context available to everything inside */}
          <HistoryProvider>
            <ScreenNavigation
              tokens={tokens}
              tab={tab}
              setTab={setTab}
              bottomTab={bottomTab}
              setBottomTab={setBottomTab}
              lastStoryboardTab={lastStoryboardTab}
              setLastStoryboardTab={setLastStoryboardTab}
              pageKeys={pageKeys}
              setPageKeys={setPageKeys}
              showPagesMenu={showPagesMenu}
              setShowPagesMenu={setShowPagesMenu}
              pageTabScrollRef={pageTabScrollRef}
              tabScrollXRef={tabScrollXRef}
              renamingPageKey={renamingPageKey}
              setRenamingPageKey={setRenamingPageKey}
              renameValue={renameValue}
              setRenameValue={setRenameValue}
              storyboardPages={storyboardPages}
              setStoryboardPages={setStoryboardPages}
              DEFAULT_PAGE_STATE={DEFAULT_PAGE_STATE}
              addNewPage={addNewPage}
              handleSharePage={handleSharePage}
              handleRefreshPage={handleRefreshPage}
              handleDeletePage={handleDeletePage}
              handleSavePageName={handleSavePageName}
              updateStoryboardPage={updateStoryboardPage}
              library={library}
              setLibrary={setLibrary}
              onUseCamera={handleUseCamera}
              onUnlockCamera={handleUnlockCamera}
              onClearCamera={handleClearCamera}
              canAddToPage={canAddToPage}
              MAX_ITEMS_PER_PAGE={MAX_ITEMS_PER_PAGE}
              wandPagerIndexRef={wandPagerIndexRef}
            />
          </HistoryProvider>
        </SafeAreaView>
      </GestureHandlerRootView>
    </FavoritesProvider>
  );
}


const styles = StyleSheet.create({

 // Storyboard screen
  storyboardRecordButtonContainer: {
    position: 'absolute',
    bottom: tokens.barHeight.md * 2 + tokens.spacing.lg, // 60 (history bar) + favorite star bar (60) + 10 (padding)
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
    zIndex: 10000,
  },
  storyboardRecordButton: {
    width: tokens.button['2xl'],
    height: tokens.button['2xl'],
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3CB371',
  },
 
  // Background images
    background: {
        ...StyleSheet.absoluteFillObject, // makes it fill its parent
        zIndex: 0, // stays in the back
        width: undefined, // prevents weird stretching
        height: undefined,
      },
  
//Animated Search Bar
  root: {
    paddingVertical: tokens.spacing.xs,
    alignItems: 'center',

  },
  searchContainer: {
    height: tokens.barHeight.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: tokens.fontSize.body,
    paddingHorizontal: tokens.spacing.lg,
    color: '#232c40',
    backgroundColor: 'transparent',
    ...Platform.select({ android: { paddingVertical: 0 } }),
  },
  iconBtn: {
    padding: tokens.spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Library styles
  libraryContainer: {
    flex: 1,
    paddingTop: tokens.spacing.md,
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#f3f6fa',
      
  },
  libraryTabText: {
    fontSize: tokens.fontSize.headline,
    fontWeight: 'bold',
    letterSpacing: 0.4,
    justifyContent: "center",
    alignContent: 'center',
    color: "#28394e",
  },

  //Homescreen Page: storyboard button 
   homebackground: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  homeScreenContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: tokens.spacing["2xl"],
  },
   homeScreenStoryboardButton: {
    height: "50%",
    width: "100%",
    marginBottom: tokens.spacing.md,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    borderRadius: tokens.radius.lg,
  },

  //library button
  homeScreenButton: {
    width: "100%",
    height: "12%",
    backgroundColor: '#62baf5ff',
    borderRadius: tokens.radius.lg,
    marginVertical: tokens.spacing.md,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,

  },
  //shop button  
  shopButton: {
    width: "100%",
    height: "20%",
    backgroundColor: "#c2f0c2ff",
    borderRadius: tokens.radius.lg,
    marginVertical: tokens.spacing.md,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,

  },
  buttonOverlayText: {
  position: "absolute",
  top: tokens.spacing.md,  
  color: "rgba(255,255,255,0.85)", // semi-transparent white
  fontSize: tokens.fontSize.title,
  fontWeight: "bold",
  letterSpacing: 2,
  textAlign: "center",
  textShadowColor: "rgba(0,0,0,0.8)", // dark shadow
  textShadowOffset: { width: 2, height: 2 },
  textShadowRadius: 4,
},
  buttonImage: {
  width: "100%",
  height: "100%",
  resizeMode: "cover",
  borderRadius: tokens.radius.md,
  justifyContent: "center",
  alignItems: "center",
  elevation: 8,
  borderWidth: 8,
  borderColor: "#fff",

},

//Shopping Page: Buddie System 
   shopbackground: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  shopScreenContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: tokens.spacing["2xl"],
  },
  shopBuddieSystemButton: {
    height: "40%",
    width: "100%",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: tokens.spacing["2xl"],

  },
  
  //Shopping page: Aurora
  shop2Button: {
    height: "40%",
    width: "100%",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",

  },
  shopButtonOverlayText: {
  position: "absolute",
  top: tokens.spacing.md,  
  color: "rgba(255,255,255,0.85)", // semi-transparent white
  fontSize: tokens.fontSize.title,
  fontWeight: "bold",
  letterSpacing: 2,
  textAlign: "center",
  textShadowColor: "rgba(0,0,0,0.8)", // dark shadow
  textShadowOffset: { width: 2, height: 2 },
  textShadowRadius: 4,
},
  shopButtonImage: {
  width: "100%",
  height: "100%",
  resizeMode: "cover",
  borderRadius: tokens.radius.lg,
  justifyContent: "center",
  alignItems: "center",
  elevation: 8,
  borderWidth: 8,
  borderColor: "#fff",
},
shopHeaderText: {
  position: "absolute",
  top: tokens.spacing["3xl"],   
  color: "rgba(255,255,255,0.85)", // semi-transparent white
  fontSize: tokens.fontSize.display,
  fontWeight: "bold",
  letterSpacing: 2,
  textAlign: "center",
  textShadowColor: "rgba(0,0,0,0.8)", // dark shadow
  textShadowOffset: { width: 2, height: 2 },
  textShadowRadius: 4,
},

});

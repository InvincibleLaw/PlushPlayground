import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const FAVORITES_KEY = "favorites";

export const FavoritesContext = createContext();

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState([]);

  // Load favorites from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_KEY).then(stored => {
      if (stored) setFavorites(JSON.parse(stored));
    });
  }, []);

  // Save favorites to AsyncStorage whenever changed
  useEffect(() => {
    AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  return (
    <FavoritesContext.Provider value={{ favorites, setFavorites }}>
      {children}
    </FavoritesContext.Provider>
  );
}

// Custom hook for convenience
export const useFavorites = () => useContext(FavoritesContext);

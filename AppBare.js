// Zero-deps sanity screen (no gestures, no reanimated hooks)
import React, { useEffect } from "react";
import { Text, View } from "react-native";

export default function AppBare() {
  useEffect(() => {
    console.log("Hermes enabled?", !!global.HermesInternal);
    console.log("Fabric enabled?", !!global.nativeFabricUIManager);
  }, []);
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>NA + Hermes sanity screen</Text>
    </View>
  );
}

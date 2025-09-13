// MUST be first:
import "react-native-gesture-handler";
import "react-native-reanimated"; // v4 requires this at top-level

import { registerRootComponent } from "expo";
import AppBare from "./AppBare";

registerRootComponent(AppBare);

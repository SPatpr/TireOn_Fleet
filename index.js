// Klasszikus (nem expo-router) belépési pont.
// A teljes app a kézi React Navigation-ös app/App.js-re épül.
import "react-native-gesture-handler";
import { registerRootComponent } from "expo";
import App from "./app/App";

registerRootComponent(App);

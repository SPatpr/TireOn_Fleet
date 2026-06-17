import {
  NavigationContainer,
  DefaultTheme as NavigationDefaultTheme,
} from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import * as NavigationBar from "expo-navigation-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import "react-native-gesture-handler";
import {
  MD3LightTheme,
  Provider as PaperProvider,
  adaptNavigationTheme,
} from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

// --- SAJÁT IMPORTOK ---
import BotNav from "../components/botNav";
import { initLogger } from "../lib/logger";
import { supabase } from "../lib/supabase";
import AddTireScreen from "../screens/AddTireScreen";
import AdminDashboardScreen from "../screens/AdminDashboardScreen";
import EmployeesScreen from "../screens/EmployeesScreen";
import SignInScreen from "../screens/SigninScreen";
import SignUpScreen from "../screens/SignupScreen";
import TiresScreen from "../screens/TiresScreen";
import TireWarehouseScreen from "../screens/TireWarehouseScreen";
import TruckScreen from "../screens/TruckScreen";
const Stack = createStackNavigator();

const { LightTheme } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
});

const FinalTheme = {
  ...MD3LightTheme,
  ...LightTheme,
  version: 3,
  colors: {
    ...MD3LightTheme.colors,
    ...LightTheme.colors,
    primary: "#0A2342",
    background: "#ffffff",
  },
  fonts: MD3LightTheme.fonts,
};

const App = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Teszt-hibajelentő inicializálása (csak nem-produkciós csatornán aktív)
    initLogger();

    // Kezdeti munkamenet ellenőrzése
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    // Android alsó sáv elrejtése
    const hideNavBar = async () => {
      try {
        await NavigationBar.setVisibilityAsync("hidden");
      } catch (e) {
        console.log("Nav bar error:", e);
      }
    };

    hideNavBar();

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  // Töltőképernyő
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0A2342",
        }}
      >
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={FinalTheme}>
        <NavigationContainer theme={LightTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {session && session.user ? (
            // Ha be van jelentkezve -> Alsó menüs főoldal
            <>
              <Stack.Screen name="Main" component={BotNav} />
              <Stack.Screen
                name="Tires"
                component={TiresScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="AddTire"
                component={AddTireScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="TireWarehouse"
                component={TireWarehouseScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="AdminDashboard"
                component={AdminDashboardScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="VehiclesManage"
                component={TruckScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="PeopleManage"
                component={EmployeesScreen}
                options={{ headerShown: false }}
              />
            </>
          ) : (
            <>
              <Stack.Screen name="SignIn" component={SignInScreen} />
              <Stack.Screen name="SignUp" component={SignUpScreen} />
            </>
          )}
        </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
};

export default App;

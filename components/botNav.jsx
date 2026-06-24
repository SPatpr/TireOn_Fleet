import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { supabase } from "../lib/supabase";

import EmployeesScreen from "../screens/EmployeesScreen";
import HomeScreen from "../screens/HomeScreen";
import ProfileScreen from "../screens/ProfileScreen";
import TruckScreen from "../screens/TruckScreen";

const Tab = createBottomTabNavigator();

const BotNav = () => {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fókuszáláskor (is) frissül a szerepkör → szerepkör-váltás után
  // (pl. owner-előléptetés) a tabok app-újraindítás NÉLKÜL frissülnek.
  // A spinner csak az első betöltésnél látszik (loading kezdőértéke true).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("role")
              .eq("id", user.id)
              .single();
            if (active) setUserRole(profile?.role);
          }
        } catch (error) {
          console.error("Navigációs jogosultság hiba:", error.message);
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => { active = false; };
    }, []),
  );

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0A2342",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Home") {
            iconName = focused ? "speedometer" : "speedometer-outline";
          } else if (route.name === "Employees") {
            iconName = focused ? "people" : "people-outline";
          } else if (route.name === "My Truck") {
            iconName = focused ? "bus" : "bus-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarStyle: {
          backgroundColor: "#0B162C",
          borderTopWidth: 0,
          height: 70,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "#64748b",
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: "Főoldal" }}
      />

      {/* FELTÉTELES: a Személyzet a cégvezetésnek (admin/manager/owner) */}
      {["admin", "manager", "owner"].includes(userRole) && (
        <Tab.Screen
          name="Employees"
          component={EmployeesScreen}
          options={{ tabBarLabel: "Személyzet" }}
        />
      )}

      <Tab.Screen
        name="My Truck"
        component={TruckScreen}
        options={{ tabBarLabel: "Flotta" }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: "Profil" }}
      />
    </Tab.Navigator>
  );
};

export default BotNav;

import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as NavigationBar from 'expo-navigation-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  View,
  useColorScheme
} from 'react-native';
import {
  MD3DarkTheme,
  MD3LightTheme,
  Provider as PaperProvider,
  adaptNavigationTheme
} from 'react-native-paper';

import { supabase } from '../lib/supabase';

import SideNav from '../components/sideNav.jsx';
import SignInScreen from '../screens/SigninScreen.jsx';
import SignUpScreen from '../screens/SignupScreen.jsx';

const Stack = createStackNavigator();

const { LightTheme, DarkTheme } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  reactNavigationDark: NavigationDarkTheme,
});


const CombinedLightTheme = {
  ...MD3LightTheme,
  ...LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...LightTheme.colors,
    primary: '#0A2342',
    background: '#ffffff',
    text: '#0A2342',
  },
  fonts: MD3LightTheme.fonts,
};

const CombinedDarkTheme = {
  ...MD3DarkTheme,
  ...DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...DarkTheme.colors,
    primary: '#90CAF9',
    background: '#051221',
    text: '#ffffff',
  },
  fonts: MD3LightTheme.fonts,
};

const App = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const colorScheme = useColorScheme();

  const theme = colorScheme === 'dark' ? CombinedDarkTheme : CombinedLightTheme;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    const hideNavigationBar = async () => {
      try {
        await NavigationBar.setVisibilityAsync('hidden'); 
        
        await NavigationBar.setBehaviorAsync('overlay-swipe');
      } catch (e) {
        console.log("Navigation bar error:", e);
      }
    };
    
    hideNavigationBar();
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A2342' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <PaperProvider theme={theme}>
        <Stack.Navigator 
            screenOptions={{ 
                headerShown: false,
            }}
        >
          
          {session && session.user ? (
             <Stack.Screen name="Main" component={SideNav} />
          ) : (
             <>
               <Stack.Screen name="SignInScreen" component={SignInScreen} />
               <Stack.Screen name="SignUpScreen" component={SignUpScreen} />
             </>
          )}

        </Stack.Navigator>
    </PaperProvider>
  );
};

export default App;
import { createStackNavigator } from '@react-navigation/stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { DefaultTheme, Provider as PaperProvider } from 'react-native-paper';

import { supabase } from '../lib/supabase';

import SideNav from '../components/sideNav.jsx';
import SignInScreen from '../screens/SigninScreen.jsx';
import SignUpScreen from '../screens/SignupScreen.jsx';

const Stack = createStackNavigator();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#0A2342',
    background: '#0A2342',
    text: '#0A2342',
  },
};

const App = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {í
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });


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
                cardStyle: { backgroundColor: '#0A2342' } 
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